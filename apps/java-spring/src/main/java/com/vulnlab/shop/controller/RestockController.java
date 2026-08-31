package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.RestockSubscription;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.ProductRepository;
import com.vulnlab.shop.repository.RestockSubscriptionRepository;
import com.vulnlab.shop.security.Roles;
import com.vulnlab.shop.vuln.CallbackFetcher;
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

    @PostMapping
    public ResponseEntity<?> subscribe(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Object rawProductId = body.get("productId");
        if (rawProductId == null) return ResponseEntity.badRequest().body(Map.of("error", "상품 번호가 필요합니다."));
        Product product = productRepository.findById(Long.valueOf(String.valueOf(rawProductId))).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();
        RestockSubscription sub = new RestockSubscription();
        sub.setProductId(product.getId());
        sub.setUserId(user.getId());
        sub.setCallbackUrl(body.get("callbackUrl") == null ? null : String.valueOf(body.get("callbackUrl")));
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
            m.put("callbackUrl", s.getCallbackUrl());
            m.put("createdAt", s.getCreatedAt());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("subscriptions", out));
    }

    // 재입고 통지 발송 — 구독자가 등록한 콜백 URL로 서버가 요청하고 그 응답을 그대로 반환한다.
    @PostMapping("/{id}/send")
    public ResponseEntity<?> send(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        RestockSubscription sub = restockRepository.findById(id).orElse(null);
        if (sub == null) return ResponseEntity.notFound().build();
        if (sub.getCallbackUrl() == null || sub.getCallbackUrl().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "콜백 URL이 없습니다."));
        }
        try {
            CallbackFetcher.Result result = CallbackFetcher.fetch(sub.getCallbackUrl());
            return ResponseEntity.ok(Map.of("ok", true, "status", result.status, "body", result.body == null ? "" : result.body));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "콜백 요청 실패: " + e.getMessage()));
        }
    }
}
