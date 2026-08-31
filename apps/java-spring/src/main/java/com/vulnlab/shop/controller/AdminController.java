package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.entity.Order;
import com.vulnlab.shop.entity.OrderItem;
import com.vulnlab.shop.repository.FaqRepository;
import com.vulnlab.shop.repository.NoticeRepository;
import com.vulnlab.shop.repository.OrderItemRepository;
import com.vulnlab.shop.entity.LoginLog;
import com.vulnlab.shop.repository.LoginLogRepository;
import com.vulnlab.shop.repository.OrderRepository;
import com.vulnlab.shop.entity.StoreSetting;
import com.vulnlab.shop.repository.ProductRepository;
import com.vulnlab.shop.repository.StoreSettingRepository;
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
    private final LoginLogRepository loginLogRepository;
    private final StoreSettingRepository storeSettingRepository;

    private static final String WEBHOOK_KEY = "notification_webhook_url";

    public AdminController(UserRepository userRepository, ProductRepository productRepository,
                            OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                            FaqRepository faqRepository, NoticeRepository noticeRepository,
                            LoginLogRepository loginLogRepository, StoreSettingRepository storeSettingRepository) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.faqRepository = faqRepository;
        this.noticeRepository = noticeRepository;
        this.loginLogRepository = loginLogRepository;
        this.storeSettingRepository = storeSettingRepository;
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

    // 관리자 사용자 프로필 수정 — 화이트리스트 필드만(역할/비밀번호/활성은 별도 엔드포인트)
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        User target = userRepository.findById(id).orElse(null);
        if (target == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "사용자를 찾을 수 없습니다."));
        }
        if (body.containsKey("name")) target.setName(body.get("name"));
        if (body.containsKey("phone")) target.setPhone(body.get("phone"));
        if (body.containsKey("postcode")) target.setPostcode(body.get("postcode"));
        if (body.containsKey("address")) target.setAddress(body.get("address"));
        if (body.containsKey("addressDetail")) target.setAddressDetail(body.get("addressDetail"));
        if (body.containsKey("bio")) target.setBio(body.get("bio"));
        userRepository.save(target);
        return ResponseEntity.ok(Map.of("ok", true));
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

    @PutMapping("/users/{id}/active")
    public ResponseEntity<?> updateActive(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        User target = userRepository.findById(id).orElse(null);
        if (target == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "사용자를 찾을 수 없습니다."));
        }
        boolean active = Boolean.parseBoolean(String.valueOf(body.get("active")));
        target.setActive(active);
        userRepository.save(target);
        return ResponseEntity.ok(Map.of("ok", true, "active", active));
    }

    @GetMapping("/login-logs")
    public ResponseEntity<?> loginLogs(@RequestParam(required = false) String username,
                                        @RequestParam(required = false) String success,
                                        HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        boolean hasUsername = username != null && !username.isBlank();
        boolean hasSuccess = "0".equals(success) || "1".equals(success);
        List<LoginLog> logs;
        if (hasUsername && hasSuccess) {
            logs = loginLogRepository.findTop200ByUsernameAndSuccessOrderByIdDesc(username, "1".equals(success));
        } else if (hasUsername) {
            logs = loginLogRepository.findTop200ByUsernameOrderByIdDesc(username);
        } else if (hasSuccess) {
            logs = loginLogRepository.findTop200BySuccessOrderByIdDesc("1".equals(success));
        } else {
            logs = loginLogRepository.findTop200ByOrderByIdDesc();
        }
        return ResponseEntity.ok(Map.of("logs", logs));
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

    private static final java.util.List<String> ORDER_STATUSES = java.util.List.of("pending", "paid", "failed", "cancelled");

    @PutMapping("/orders/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        String status = body.get("status");
        if (status == null || !ORDER_STATUSES.contains(status)) {
            return ResponseEntity.badRequest().body(Map.of("error", "상태는 " + String.join(", ", ORDER_STATUSES) + " 중 하나여야 합니다."));
        }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "주문을 찾을 수 없습니다."));
        }
        order.setStatus(status);
        orderRepository.save(order);
        return ResponseEntity.ok(Map.of("ok", true, "status", status));
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
        product.setGender((String) body.get("gender"));
        product.setColor((String) body.get("color"));
        product.setMaterial((String) body.get("material"));
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
        if (body.get("gender") != null) product.setGender((String) body.get("gender"));
        if (body.get("color") != null) product.setColor((String) body.get("color"));
        if (body.get("material") != null) product.setMaterial((String) body.get("material"));
        if (body.get("stock") != null) product.setStock(Integer.parseInt(String.valueOf(body.get("stock"))));
        if (body.get("optionName") != null) product.setOptionName((String) body.get("optionName"));
        if (body.get("optionValues") != null) product.setOptionValues(joinOptionValues(body.get("optionValues")));
        productRepository.save(product);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // 공용 이미지 업로드 — 공지/이벤트 등에서 파일을 올린 뒤 반환된 filename을 imageUrl로 사용.
    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("image") MultipartFile file, HttpSession session) throws IOException {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        if (!Uploads.isAllowed(file)) {
            return ResponseEntity.badRequest().body(Map.of("error", "이미지 파일이 없거나 형식이 올바르지 않습니다."));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("filename", Uploads.store(file)));
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

    // 추천인 내역 조회 — 사용자별 추천 코드/피추천인/추천 수/포인트.
    @GetMapping("/referrals")
    public ResponseEntity<?> referrals(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        List<User> users = userRepository.findAll();
        java.util.Map<Long, String> nameById = new java.util.HashMap<>();
        java.util.Map<Long, Integer> referredCount = new java.util.HashMap<>();
        for (User u : users) {
            nameById.put(u.getId(), u.getUsername());
        }
        for (User u : users) {
            if (u.getReferredBy() != null) {
                referredCount.merge(u.getReferredBy(), 1, Integer::sum);
            }
        }
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (User u : users) {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("referralCode", u.getReferralCode());
            m.put("referredByUsername", u.getReferredBy() == null ? null : nameById.get(u.getReferredBy()));
            m.put("referredCount", referredCount.getOrDefault(u.getId(), 0));
            m.put("points", u.getPoints());
            out.add(m);
        }
        out.sort((a, b) -> ((Integer) b.get("referredCount")).compareTo((Integer) a.get("referredCount")));
        return ResponseEntity.ok(Map.of("referrals", out));
    }

    private String savedWebhook() {
        return storeSettingRepository.findById(WEBHOOK_KEY).map(StoreSetting::getValue).orElse(null);
    }

    @GetMapping("/settings")
    public ResponseEntity<?> getSettings(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        Map<String, Object> out = new java.util.HashMap<>();
        out.put("notificationWebhookUrl", savedWebhook());
        return ResponseEntity.ok(out);
    }

    @PutMapping("/settings")
    public ResponseEntity<?> saveSettings(@RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        storeSettingRepository.save(new StoreSetting(WEBHOOK_KEY, body.get("notificationWebhookUrl")));
        Map<String, Object> out = new java.util.HashMap<>();
        out.put("notificationWebhookUrl", savedWebhook());
        return ResponseEntity.ok(out);
    }

    // 알림 연동(웹훅) 테스트 — 입력 URL(없으면 저장된 URL)로 서버가 요청하고 응답을 그대로 반환한다.
    @PostMapping("/integrations/webhook/test")
    public ResponseEntity<?> testWebhook(@RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        String url = body.get("url");
        if (url == null || url.isBlank()) url = savedWebhook();
        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "URL이 필요합니다."));
        }
        try {
            com.vulnlab.shop.vuln.CallbackFetcher.Result result = com.vulnlab.shop.vuln.CallbackFetcher.fetch(url);
            return ResponseEntity.ok(Map.of("ok", true, "status", result.status, "body", result.body == null ? "" : result.body));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "웹훅 요청 실패: " + e.getMessage()));
        }
    }
}
