package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Coupon;
import com.vulnlab.shop.entity.Order;
import com.vulnlab.shop.entity.OrderItem;
import com.vulnlab.shop.entity.PointTransaction;
import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.Shipment;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.entity.UserCoupon;
import com.vulnlab.shop.repository.CartItemRepository;
import com.vulnlab.shop.repository.CartRepository;
import com.vulnlab.shop.repository.CouponRepository;
import com.vulnlab.shop.repository.OrderItemRepository;
import com.vulnlab.shop.repository.OrderRepository;
import com.vulnlab.shop.repository.PointTransactionRepository;
import com.vulnlab.shop.repository.ProductRepository;
import com.vulnlab.shop.repository.ShipmentRepository;
import com.vulnlab.shop.repository.UserCouponRepository;
import com.vulnlab.shop.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@Tag(name = "주문", description = "주문 생성·조회·결제확인·영수증 (로그인 필요)")
@SecurityRequirement(name = "sessionCookie")
public class OrderController {

    @Value("${app.toss.secret-key:}")
    private String tossSecretKey;

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final ShipmentRepository shipmentRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserCouponRepository userCouponRepository;
    private final CouponRepository couponRepository;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public OrderController(OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                            ProductRepository productRepository, UserRepository userRepository,
                            PointTransactionRepository pointTransactionRepository,
                            ShipmentRepository shipmentRepository, CartRepository cartRepository,
                            CartItemRepository cartItemRepository, UserCouponRepository userCouponRepository,
                            CouponRepository couponRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.shipmentRepository = shipmentRepository;
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.userCouponRepository = userCouponRepository;
        this.couponRepository = couponRepository;
    }

    private static String shareToken(Long orderId) {
        return Base64.getEncoder().encodeToString(String.valueOf(orderId).getBytes());
    }

    private Map<String, Object> shipmentPayload(Long orderId) {
        Shipment s = shipmentRepository.findByOrderId(orderId).orElse(null);
        if (s == null) return null;
        Map<String, Object> m = new HashMap<>();
        m.put("carrier", s.getCarrier());
        m.put("trackingNo", s.getTrackingNo());
        m.put("status", s.getStatus());
        return m;
    }

    // 주문 엔티티 → node 의 toOrder() 와 같은 형태(배송지는 shipping 객체로 중첩).
    private Map<String, Object> orderPayload(Order o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", o.getId());
        m.put("status", o.getStatus());
        m.put("totalAmount", o.getTotalAmount());
        m.put("discountAmount", o.getDiscountAmount());
        m.put("webhookUrl", o.getWebhookUrl());
        m.put("tossOrderId", o.getTossOrderId());
        m.put("shareToken", o.getShareToken());
        m.put("createdAt", o.getCreatedAt());
        if (o.getShipName() != null) {
            Map<String, Object> shipping = new HashMap<>();
            shipping.put("name", o.getShipName());
            shipping.put("phone", o.getShipPhone());
            shipping.put("postcode", o.getShipPostcode());
            shipping.put("address", o.getShipAddress());
            shipping.put("addressDetail", o.getShipAddressDetail());
            m.put("shipping", shipping);
        } else {
            m.put("shipping", null);
        }
        return m;
    }

    private User currentUser(HttpSession session) {
        return (User) session.getAttribute("user");
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
    }

    @Operation(summary = "내 주문 목록")
    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        return ResponseEntity.ok(Map.of("orders",
                orderRepository.findByUserId(user.getId()).stream().map(this::orderPayload).toList()));
    }

    @Operation(summary = "주문 상세 (주문 + 항목 + 배송)")
    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id, HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getUserId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        Map<String, Object> out = new HashMap<>();
        out.put("order", orderPayload(order));
        out.put("items", items);
        out.put("shipment", shipmentPayload(order.getId()));
        return ResponseEntity.ok(out);
    }

    @Operation(summary = "주문 공유 링크 조회 (비회원)", description = "공유 토큰만으로 주문·배송을 읽기 전용 열람한다.")
    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @GetMapping("/shared/{token}")
    public ResponseEntity<?> shared(@PathVariable String token) {
        Order order = orderRepository.findByShareToken(token).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "주문을 찾을 수 없습니다."));
        }
        Map<String, Object> o = new HashMap<>();
        o.put("id", order.getId());
        o.put("status", order.getStatus());
        o.put("totalAmount", order.getTotalAmount());
        o.put("discountAmount", order.getDiscountAmount());
        o.put("createdAt", order.getCreatedAt());
        Map<String, Object> shipping = new HashMap<>();
        shipping.put("name", order.getShipName());
        shipping.put("phone", order.getShipPhone());
        shipping.put("postcode", order.getShipPostcode());
        shipping.put("address", order.getShipAddress());
        shipping.put("addressDetail", order.getShipAddressDetail());
        o.put("shipping", order.getShipName() == null ? null : shipping);
        Map<String, Object> out = new HashMap<>();
        out.put("order", o);
        out.put("items", orderItemRepository.findByOrderId(order.getId()));
        out.put("shipment", shipmentPayload(order.getId()));
        return ResponseEntity.ok(out);
    }

    @Operation(summary = "주문 생성",
            description = "가격은 서버가 계산한다. 체크아웃 시 재고 차감·쿠폰 적용·배송지 스냅샷이 함께 처리된다.")
    @SuppressWarnings("unchecked")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();

        Object rawItems = body.get("items");
        if (!(rawItems instanceof List<?> items) || items.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "최소 1개 이상의 상품이 필요합니다."));
        }

        BigDecimal itemsTotal = BigDecimal.ZERO;
        List<OrderItem> newItems = new ArrayList<>();
        List<int[]> stockOps = new ArrayList<>(); // [productId, quantity]
        for (Object raw : items) {
            Map<String, Object> item = (Map<String, Object>) raw;
            Long productId = Long.valueOf(String.valueOf(item.get("productId")));
            int quantity = Integer.parseInt(String.valueOf(item.get("quantity")));
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "유효하지 않은 주문 항목입니다."));
            }
            itemsTotal = itemsTotal.add(product.getPrice().multiply(BigDecimal.valueOf(quantity)));
            OrderItem oi = new OrderItem();
            oi.setProductId(product.getId());
            oi.setQuantity(quantity);
            oi.setUnitPrice(product.getPrice());
            Object optionValue = item.get("optionValue");
            oi.setOptionValue(optionValue == null ? null : String.valueOf(optionValue));
            newItems.add(oi);
            stockOps.add(new int[]{productId.intValue(), quantity});
        }

        // 재고 차감 — 현재 재고를 읽고 감산 후 저장한다.
        for (int[] op : stockOps) {
            Product p = productRepository.findById((long) op[0]).orElseThrow();
            p.setStock(p.getStock() - op[1]);
            productRepository.save(p);
        }

        // 쿠폰 적용
        BigDecimal discount = BigDecimal.ZERO;
        Long couponId = null;
        String couponCode = body.get("couponCode") == null ? null : String.valueOf(body.get("couponCode"));
        if (couponCode != null && !couponCode.isBlank()) {
            Map<String, Object> applied = applyCoupon(user.getId(), couponCode.trim(), itemsTotal);
            if (Boolean.FALSE.equals(applied.get("ok"))) {
                return ResponseEntity.badRequest().body(Map.of("error", applied.get("reason")));
            }
            discount = (BigDecimal) applied.get("discount");
            couponId = (Long) applied.get("couponId");
        }

        int pointsUsed = body.get("pointsUsed") == null ? 0
                : Integer.parseInt(String.valueOf(body.get("pointsUsed")));
        BigDecimal total = itemsTotal.subtract(discount).subtract(BigDecimal.valueOf(pointsUsed));

        // 배송지 스냅샷 — override가 있으면 그것을, 없으면 프로필 주소를 복사한다.
        User dbUser = userRepository.findById(user.getId()).orElse(user);
        Map<String, Object> shipping = body.get("shipping") instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();

        Order order = new Order();
        order.setUserId(user.getId());
        order.setStatus("pending");
        order.setTotalAmount(total);
        order.setDiscountAmount(discount);
        order.setCouponId(couponId);
        order.setPointsUsed(pointsUsed);
        order.setWebhookUrl((String) body.get("webhookUrl"));
        order.setTossOrderId("order_" + UUID.randomUUID());
        order.setShipName(str(shipping.get("name"), dbUser.getName()));
        order.setShipPhone(str(shipping.get("phone"), dbUser.getPhone()));
        order.setShipPostcode(str(shipping.get("postcode"), dbUser.getPostcode()));
        order.setShipAddress(str(shipping.get("address"), dbUser.getAddress()));
        order.setShipAddressDetail(str(shipping.get("addressDetail"), dbUser.getAddressDetail()));
        orderRepository.save(order);
        order.setShareToken(shareToken(order.getId()));
        orderRepository.save(order);

        for (OrderItem oi : newItems) {
            oi.setOrderId(order.getId());
        }
        orderItemRepository.saveAll(newItems);

        // 포인트 사용/적립과 쿠폰 사용 마킹은 결제 확인(POST /{id}/confirm) 시점에 처리한다.
        int earned = itemsTotal.multiply(BigDecimal.valueOf(5)).divide(BigDecimal.valueOf(100)).intValue();

        // 서버 장바구니 비우기
        cartRepository.findByUserId(user.getId()).ifPresent(c -> cartItemRepository.deleteByCartId(c.getId()));

        Map<String, Object> out = new HashMap<>();
        out.put("orderId", order.getId());
        out.put("tossOrderId", order.getTossOrderId());
        out.put("amount", total);
        out.put("discountAmount", discount);
        out.put("pointsUsed", pointsUsed);
        out.put("pointsEarned", earned);
        out.put("shareToken", order.getShareToken());
        return ResponseEntity.status(HttpStatus.CREATED).body(out);
    }

    private static String str(Object override, String fallback) {
        return (override == null || String.valueOf(override).isBlank()) ? fallback : String.valueOf(override);
    }

    // 쿠폰 유효성 검증 + 할인액 계산(서버). used 여부는 여기서 보지 않는다.
    private Map<String, Object> applyCoupon(Long userId, String code, BigDecimal itemsTotal) {
        UserCoupon match = null;
        Coupon coupon = null;
        for (UserCoupon uc : userCouponRepository.findByUserIdOrderByIdDesc(userId)) {
            Coupon c = couponRepository.findById(uc.getCouponId()).orElse(null);
            if (c != null && code.equals(c.getCode())) {
                match = uc;
                coupon = c;
                break;
            }
        }
        if (coupon == null) return Map.of("ok", false, "reason", "보유하지 않은 쿠폰입니다.");
        if (!coupon.isActive()) return Map.of("ok", false, "reason", "사용할 수 없는 쿠폰입니다.");
        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().compareTo(java.time.Instant.now().toString()) < 0) {
            return Map.of("ok", false, "reason", "만료된 쿠폰입니다.");
        }
        if (itemsTotal.intValue() < coupon.getMinOrderAmount()) {
            return Map.of("ok", false, "reason", "최소 주문금액 " + coupon.getMinOrderAmount() + "원 이상부터 사용 가능합니다.");
        }
        BigDecimal discount = "percent".equals(coupon.getDiscountType())
                ? itemsTotal.multiply(BigDecimal.valueOf(coupon.getDiscountValue())).divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.FLOOR)
                : BigDecimal.valueOf(coupon.getDiscountValue());
        discount = discount.min(itemsTotal);
        Map<String, Object> ok = new HashMap<>();
        ok.put("ok", true);
        ok.put("discount", discount);
        ok.put("couponId", coupon.getId());
        ok.put("userCoupon", match);
        return ok;
    }

    @Operation(summary = "결제 확인", description = "{ paymentKey, amount }. TOSS_SECRET_KEY 미설정 시 501.")
    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirm(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) throws Exception {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getUserId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        if ("paid".equals(order.getStatus())) {
            return ResponseEntity.ok(Map.of("ok", true, "order", order));
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

        // 결제가 확정된 시점에만 포인트를 차감/적립하고 쿠폰을 사용 처리한다.
        int pointsUsed = order.getPointsUsed();
        BigDecimal itemsTotal = order.getTotalAmount().add(order.getDiscountAmount()).add(BigDecimal.valueOf(pointsUsed));
        int earned = itemsTotal.multiply(BigDecimal.valueOf(5)).divide(BigDecimal.valueOf(100)).intValue();
        User dbUser = userRepository.findById(order.getUserId()).orElse(null);
        if (dbUser != null) {
            if (pointsUsed != 0) {
                dbUser.setPoints(dbUser.getPoints() - pointsUsed);
                pointTransactionRepository.save(new PointTransaction(dbUser.getId(), -pointsUsed, "주문 사용", order.getId()));
            }
            if (earned > 0) {
                dbUser.setPoints(dbUser.getPoints() + earned);
                pointTransactionRepository.save(new PointTransaction(dbUser.getId(), earned, "주문 적립", order.getId()));
            }
            userRepository.save(dbUser);
        }
        // 쿠폰 사용 처리 — 이미 사용된 쿠폰인지 확인하지 않는다.
        if (order.getCouponId() != null) {
            userCouponRepository.findByUserIdOrderByIdDesc(order.getUserId()).stream()
                    .filter(uc -> order.getCouponId().equals(uc.getCouponId()))
                    .findFirst()
                    .ifPresent(uc -> { uc.setUsed(true); userCouponRepository.save(uc); });
        }

        fireWebhook(order.getWebhookUrl(), order);

        return ResponseEntity.ok(Map.of("ok", true, "order", order));
    }

    private static final Path RECEIPTS_DIR = Paths.get("receipts");

    @Operation(summary = "영수증 파일 생성", description = "{ note } 선택. 서버에 receipt_<id>.txt 생성 후 파일명 반환.")
    @PostMapping("/{id}/receipt")
    public ResponseEntity<?> generateReceipt(@PathVariable Long id,
                                             @RequestBody(required = false) Map<String, Object> body,
                                             HttpSession session) throws Exception {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getUserId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        Files.createDirectories(RECEIPTS_DIR);
        String filename = "receipt_" + order.getId() + ".txt";
        Object rawNote = body == null ? null : body.get("note");
        String note = rawNote != null ? String.valueOf(rawNote)
                : (user.getBio() != null ? user.getBio() : "");
        String cmd = "echo \"영수증 - 주문번호: " + order.getTossOrderId()
                + " / 수령인: " + user.getName()
                + " / 메모: " + note + "\" > " + RECEIPTS_DIR.resolve(filename);
        Process p = Runtime.getRuntime().exec(new String[]{"sh", "-c", cmd});
        p.waitFor();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("filename", filename));
    }

    @Operation(summary = "인쇄용 영수증 (HTML)")
    @ApiResponse(responseCode = "200", content = @Content(mediaType = MediaType.TEXT_HTML_VALUE))
    @GetMapping(value = "/{id}/receipt/print", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<?> printReceipt(@PathVariable Long id,
                                          @RequestParam(value = "note", required = false) String note,
                                          HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getUserId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        String html = "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\"><title>영수증</title></head>"
                + "<body><h1>영수증</h1>"
                + "<p>주문번호: " + order.getTossOrderId() + "</p>"
                + "<p>수령인: " + user.getName() + "</p>"
                + "<p>결제금액: " + order.getTotalAmount().toPlainString() + "</p>"
                + "<p>메모: " + (note == null ? "" : note) + "</p>"
                + "</body></html>";
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    @Operation(summary = "영수증 파일 다운로드 (text/plain)")
    @ApiResponse(responseCode = "200", content = @Content(mediaType = MediaType.TEXT_PLAIN_VALUE))
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
