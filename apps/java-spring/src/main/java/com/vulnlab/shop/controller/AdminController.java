package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.entity.Order;
import com.vulnlab.shop.entity.OrderItem;
import com.vulnlab.shop.repository.FaqRepository;
import com.vulnlab.shop.repository.NoticeRepository;
import com.vulnlab.shop.repository.OrderItemRepository;
import com.vulnlab.shop.repository.OrderRepository;
import com.vulnlab.shop.repository.ProductRepository;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.security.Roles;
import com.vulnlab.shop.storage.Uploads;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final FaqRepository faqRepository;
    private final NoticeRepository noticeRepository;

    public AdminController(UserRepository userRepository, ProductRepository productRepository,
                            OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                            FaqRepository faqRepository, NoticeRepository noticeRepository) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.faqRepository = faqRepository;
        this.noticeRepository = noticeRepository;
    }

    private ResponseEntity<?> requireAdmin(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        if (!Roles.isAdminOrAbove(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "관리자 권한이 필요합니다."));
        }
        return null;
    }

    private ResponseEntity<?> requireSystemAdmin(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        if (!Roles.isSystemAdmin(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "시스템 관리자 권한이 필요합니다."));
        }
        return null;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        return ResponseEntity.ok(Map.of(
                "users", userRepository.count(),
                "orders", orderRepository.count(),
                "products", productRepository.count(),
                "faqs", faqRepository.count(),
                "notices", noticeRepository.count()));
    }

    @GetMapping("/users")
    public ResponseEntity<?> listUsers(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        return ResponseEntity.ok(Map.of("users", userRepository.findAll()));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        User target = userRepository.findById(id).orElse(null);
        if (target == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "사용자를 찾을 수 없습니다."));
        }
        List<Map<String, Object>> orders = orderRepository.findByUserId(id).stream()
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .map(o -> Map.<String, Object>of(
                        "id", o.getId(),
                        "status", o.getStatus(),
                        "totalAmount", o.getTotalAmount(),
                        "createdAt", o.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(Map.of("user", target, "orders", orders));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireSystemAdmin(session);
        if (denied != null) return denied;
        String role = body.get("role");
        if (!Roles.USER.equals(role) && !Roles.ADMIN.equals(role) && !Roles.SYSTEM_ADMIN.equals(role)) {
            return ResponseEntity.badRequest().body(Map.of("error", "권한은 \"user\", \"admin\", \"system_admin\" 중 하나여야 합니다."));
        }
        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        target.setRole(role);
        userRepository.save(target);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/orders")
    public ResponseEntity<?> listOrders(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .map(o -> Map.<String, Object>of(
                        "id", o.getId(),
                        "username", userRepository.findById(o.getUserId()).map(User::getUsername).orElse("unknown"),
                        "status", o.getStatus(),
                        "totalAmount", o.getTotalAmount(),
                        "createdAt", o.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(Map.of("orders", orders));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "주문을 찾을 수 없습니다."));
        }
        Map<String, Object> orderMap = new java.util.HashMap<>();
        orderMap.put("id", order.getId());
        orderMap.put("username", userRepository.findById(order.getUserId()).map(User::getUsername).orElse("unknown"));
        orderMap.put("status", order.getStatus());
        orderMap.put("totalAmount", order.getTotalAmount());
        orderMap.put("tossOrderId", order.getTossOrderId());
        orderMap.put("createdAt", order.getCreatedAt());

        List<Map<String, Object>> items = orderItemRepository.findByOrderId(order.getId()).stream()
                .map(oi -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("productId", oi.getProductId());
                    m.put("productName", productRepository.findById(oi.getProductId())
                            .map(com.vulnlab.shop.entity.Product::getName).orElse("(삭제된 상품)"));
                    m.put("quantity", oi.getQuantity());
                    m.put("unitPrice", oi.getUnitPrice());
                    m.put("optionValue", oi.getOptionValue());
                    return m;
                })
                .toList();
        return ResponseEntity.ok(Map.of("order", orderMap, "items", items));
    }

    @PostMapping("/products")
    public ResponseEntity<?> createProduct(@RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        String name = (String) body.get("name");
        Object priceRaw = body.get("price");
        if (name == null || name.isBlank() || priceRaw == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "이름과 가격은 필수입니다."));
        }
        Product product = new Product();
        product.setName(name);
        product.setDescription((String) body.get("description"));
        product.setPrice(new BigDecimal(String.valueOf(priceRaw)));
        product.setImageUrl((String) body.get("imageUrl"));
        product.setCategory((String) body.get("category"));
        product.setBrand((String) body.get("brand"));
        product.setSku((String) body.get("sku"));
        if (body.get("stock") != null) product.setStock(Integer.parseInt(String.valueOf(body.get("stock"))));
        product.setOptionName((String) body.get("optionName"));
        product.setOptionValues(joinOptionValues(body.get("optionValues")));
        productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", product.getId()));
    }

    @SuppressWarnings("unchecked")
    private String joinOptionValues(Object raw) {
        if (raw instanceof List<?> list) {
            return String.join(",", list.stream().map(String::valueOf).toList());
        }
        return raw == null ? null : String.valueOf(raw);
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();
        if (body.get("name") != null) product.setName((String) body.get("name"));
        if (body.get("description") != null) product.setDescription((String) body.get("description"));
        if (body.get("price") != null) product.setPrice(new BigDecimal(String.valueOf(body.get("price"))));
        if (body.get("imageUrl") != null) product.setImageUrl((String) body.get("imageUrl"));
        if (body.get("category") != null) product.setCategory((String) body.get("category"));
        if (body.get("brand") != null) product.setBrand((String) body.get("brand"));
        if (body.get("sku") != null) product.setSku((String) body.get("sku"));
        if (body.get("stock") != null) product.setStock(Integer.parseInt(String.valueOf(body.get("stock"))));
        if (body.get("optionName") != null) product.setOptionName((String) body.get("optionName"));
        if (body.get("optionValues") != null) product.setOptionValues(joinOptionValues(body.get("optionValues")));
        productRepository.save(product);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/products/{id}/image")
    public ResponseEntity<?> uploadProductImage(@PathVariable Long id, @RequestParam("image") MultipartFile file,
                                                 HttpSession session) throws IOException {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();
        if (!Uploads.isAllowed(file)) {
            return ResponseEntity.badRequest().body(Map.of("error", "이미지 파일이 없거나 형식이 올바르지 않습니다."));
        }
        String filename = Uploads.store(file);
        product.setImageUrl(filename);
        productRepository.save(product);
        return ResponseEntity.ok(Map.of("imageUrl", filename));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        if (!productRepository.existsById(id)) return ResponseEntity.notFound().build();
        productRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
