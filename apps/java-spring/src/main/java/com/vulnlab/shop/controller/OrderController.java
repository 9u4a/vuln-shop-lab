package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Order;
import com.vulnlab.shop.entity.OrderItem;
import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.OrderItemRepository;
import com.vulnlab.shop.repository.OrderRepository;
import com.vulnlab.shop.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Value("${app.toss.secret-key:}")
    private String tossSecretKey;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public OrderController(OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                            ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
    }

    private User currentUser(HttpSession session) {
        return (User) session.getAttribute("user");
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        return ResponseEntity.ok(Map.of("orders", orderRepository.findByUserId(user.getId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id, HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getUserId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        return ResponseEntity.ok(Map.of("order", order, "items", items));
    }

    @SuppressWarnings("unchecked")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();

        Object rawItems = body.get("items");
        if (!(rawItems instanceof List<?> items) || items.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "최소 1개 이상의 상품이 필요합니다."));
        }

        BigDecimal total = BigDecimal.ZERO;
        List<OrderItem> newItems = new ArrayList<>();
        for (Object raw : items) {
            Map<String, Object> item = (Map<String, Object>) raw;
            Long productId = Long.valueOf(String.valueOf(item.get("productId")));
            int quantity = Integer.parseInt(String.valueOf(item.get("quantity")));
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null || quantity < 1) {
                return ResponseEntity.badRequest().body(Map.of("error", "유효하지 않은 주문 항목입니다."));
            }
            total = total.add(product.getPrice().multiply(BigDecimal.valueOf(quantity)));
            OrderItem oi = new OrderItem();
            oi.setProductId(product.getId());
            oi.setQuantity(quantity);
            oi.setUnitPrice(product.getPrice());
            Object optionValue = item.get("optionValue");
            oi.setOptionValue(optionValue == null ? null : String.valueOf(optionValue));
            newItems.add(oi);
        }

        Order order = new Order();
        order.setUserId(user.getId());
        order.setStatus("pending");
        order.setTotalAmount(total);
        order.setWebhookUrl((String) body.get("webhookUrl"));
        order.setTossOrderId("order_" + UUID.randomUUID());
        orderRepository.save(order);

        for (OrderItem oi : newItems) {
            oi.setOrderId(order.getId());
        }
        orderItemRepository.saveAll(newItems);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("orderId", order.getId(), "tossOrderId", order.getTossOrderId(), "amount", total));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirm(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) throws Exception {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getUserId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        if (tossSecretKey == null || tossSecretKey.isBlank()) {
            return ResponseEntity.status(501)
                    .body(Map.of("error", "이 서버에는 결제가 설정되어 있지 않습니다 (TOSS_SECRET_KEY 누락)."));
        }

        String paymentKey = (String) body.get("paymentKey");
        BigDecimal amount = new BigDecimal(String.valueOf(body.get("amount")));
        if (paymentKey == null || amount.compareTo(order.getTotalAmount()) != 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "결제 검증에 실패했습니다: 금액이 일치하지 않습니다."));
        }

        String authHeader = "Basic " + Base64.getEncoder().encodeToString((tossSecretKey + ":").getBytes());
        String requestBody = String.format(
                "{\"paymentKey\":\"%s\",\"orderId\":\"%s\",\"amount\":%s}",
                paymentKey, order.getTossOrderId(), order.getTotalAmount().toPlainString());

        HttpRequest tossRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.tosspayments.com/v1/payments/confirm"))
                .header("Authorization", authHeader)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();
        HttpResponse<String> tossResponse = httpClient.send(tossRequest, HttpResponse.BodyHandlers.ofString());

        if (tossResponse.statusCode() >= 300) {
            order.setStatus("failed");
            orderRepository.save(order);
            return ResponseEntity.status(502).body(Map.of("error", "결제 확인에 실패했습니다.", "detail", tossResponse.body()));
        }

        order.setStatus("paid");
        order.setTossPaymentKey(paymentKey);
        orderRepository.save(order);
        fireWebhook(order.getWebhookUrl(), order);

        return ResponseEntity.ok(Map.of("ok", true, "order", order));
    }

    private static final Path RECEIPTS_DIR = Paths.get("receipts");

    @PostMapping("/{id}/receipt")
    public ResponseEntity<?> generateReceipt(@PathVariable Long id, HttpSession session) throws Exception {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getUserId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        Files.createDirectories(RECEIPTS_DIR);
        String filename = "receipt_" + order.getId() + ".txt";
        String content = "영수증 - 주문번호: " + order.getTossOrderId() + " / 수령인: " + user.getName();
        Files.writeString(RECEIPTS_DIR.resolve(filename), content);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("filename", filename));
    }

    @GetMapping("/receipt/{filename}")
    public ResponseEntity<?> downloadReceipt(@PathVariable String filename, HttpSession session) throws Exception {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Path filePath = RECEIPTS_DIR.resolve(filename);
        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }
        String content = Files.readString(filePath);
        return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(content);
    }

    private void fireWebhook(String webhookUrl, Order order) {
        if (webhookUrl == null || webhookUrl.isBlank()) return;
        try {
            String payload = String.format(
                    "{\"orderId\":%d,\"tossOrderId\":\"%s\",\"status\":\"paid\",\"amount\":%s}",
                    order.getId(), order.getTossOrderId(), order.getTotalAmount().toPlainString());
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(webhookUrl))
                    .timeout(Duration.ofSeconds(5))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            httpClient.send(request, HttpResponse.BodyHandlers.discarding());
        } catch (Exception e) {
            System.err.println("Order webhook delivery failed: " + e.getMessage());
        }
    }
}
