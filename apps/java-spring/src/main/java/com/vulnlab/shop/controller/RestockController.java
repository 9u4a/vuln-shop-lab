package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.RestockSubscription;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.ProductRepository;
import com.vulnlab.shop.repository.RestockSubscriptionRepository;
import com.vulnlab.shop.security.Roles;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/restock")
public class RestockController {

    private final RestockSubscriptionRepository restockRepository;
    private final ProductRepository productRepository;

    public RestockController(RestockSubscriptionRepository restockRepository, ProductRepository productRepository) {
        this.restockRepository = restockRepository;
        this.productRepository = productRepository;
    }

    private User currentUser(HttpSession session) {
        return (User) session.getAttribute("user");
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
    }

    private ResponseEntity<?> requireAdmin(HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        if (!Roles.isAdminOrAbove(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "관리자 권한이 필요합니다."));
        }
        return null;
    }

    // 품절 상품 재입고 알림 신청 — 버튼 한 번으로 신청(같은 상품 중복 신청은 무시).
    @PostMapping
    public ResponseEntity<?> subscribe(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Object rawProductId = body.get("productId");
        if (rawProductId == null) return ResponseEntity.badRequest().body(Map.of("error", "상품 번호가 필요합니다."));
        Product product = productRepository.findById(Long.valueOf(String.valueOf(rawProductId))).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();
        RestockSubscription existing = restockRepository.findByProductIdAndUserId(product.getId(), user.getId()).orElse(null);
        if (existing != null) {
            return ResponseEntity.ok(Map.of("id", existing.getId(), "already", true));
        }
        RestockSubscription sub = new RestockSubscription();
        sub.setProductId(product.getId());
        sub.setUserId(user.getId());
        restockRepository.save(sub);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", sub.getId()));
    }

    @GetMapping("/mine")
    public ResponseEntity<?> mine(HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        return ResponseEntity.ok(Map.of("subscriptions", restockRepository.findByUserIdOrderByIdDesc(user.getId())));
    }

    @GetMapping
    public ResponseEntity<?> all(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        List<Map<String, Object>> out = restockRepository.findAllByOrderByIdDesc().stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("productId", s.getProductId());
            m.put("productName", productRepository.findById(s.getProductId()).map(Product::getName).orElse(null));
            m.put("notified", s.isNotified());
            m.put("createdAt", s.getCreatedAt());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("subscriptions", out));
    }

    // 재입고 알림 발송 — 인앱 통지 처리(해당 상품 구독자 모두 notified 처리).
    @PostMapping("/notify/{productId}")
    public ResponseEntity<?> notify(@PathVariable Long productId, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        int count = 0;
        for (RestockSubscription s : restockRepository.findByProductId(productId)) {
            if (!s.isNotified()) {
                s.setNotified(true);
                restockRepository.save(s);
                count++;
            }
        }
        return ResponseEntity.ok(Map.of("ok", true, "notified", count));
    }
}
