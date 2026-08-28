package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Coupon;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.entity.UserCoupon;
import com.vulnlab.shop.repository.CouponRepository;
import com.vulnlab.shop.repository.UserCouponRepository;
import com.vulnlab.shop.security.Roles;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponRepository couponRepository;
    private final UserCouponRepository userCouponRepository;

    public CouponController(CouponRepository couponRepository, UserCouponRepository userCouponRepository) {
        this.couponRepository = couponRepository;
        this.userCouponRepository = userCouponRepository;
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

    // 발급 가능한(활성 + 미만료) 쿠폰. 로그인 사용자는 이미 받았는지(claimed) 포함.
    @GetMapping
    public Map<String, Object> list(HttpSession session) {
        String now = Instant.now().toString();
        List<Coupon> coupons = couponRepository.findByActiveTrueOrderByIdDesc().stream()
                .filter(c -> c.getExpiresAt() == null || c.getExpiresAt().compareTo(now) >= 0)
                .collect(Collectors.toList());
        User user = (User) session.getAttribute("user");
        Set<Long> claimed = user == null ? Set.of()
                : userCouponRepository.findByUserIdOrderByIdDesc(user.getId()).stream()
                    .map(UserCoupon::getCouponId).collect(Collectors.toSet());
        for (Coupon c : coupons) {
            c.setClaimed(claimed.contains(c.getId()));
        }
        return Map.of("coupons", coupons);
    }

    // 내 쿠폰함.
    @GetMapping("/mine")
    public ResponseEntity<?> mine(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (UserCoupon uc : userCouponRepository.findByUserIdOrderByIdDesc(user.getId())) {
            couponRepository.findById(uc.getCouponId()).ifPresent(c -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", c.getId());
                m.put("code", c.getCode());
                m.put("title", c.getTitle());
                m.put("description", c.getDescription());
                m.put("discountType", c.getDiscountType());
                m.put("discountValue", c.getDiscountValue());
                m.put("minOrderAmount", c.getMinOrderAmount());
                m.put("expiresAt", c.getExpiresAt());
                m.put("userCouponId", uc.getId());
                m.put("used", uc.isUsed());
                m.put("claimedAt", uc.getClaimedAt());
                result.add(m);
            });
        }
        return ResponseEntity.ok(Map.of("coupons", result));
    }

    // 쿠폰 받기(발급).
    @PostMapping("/{id}/claim")
    public ResponseEntity<?> claim(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        Coupon coupon = couponRepository.findById(id).filter(Coupon::isActive).orElse(null);
        if (coupon == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "쿠폰을 찾을 수 없습니다."));
        }
        UserCoupon uc = userCouponRepository.save(new UserCoupon(user.getId(), coupon.getId()));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("userCouponId", uc.getId(), "coupon", coupon));
    }

    @GetMapping("/manage")
    public ResponseEntity<?> manage(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        List<Coupon> coupons = new ArrayList<>(couponRepository.findAll());
        coupons.sort((a, b) -> b.getId().compareTo(a.getId()));
        return ResponseEntity.ok(Map.of("coupons", coupons));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        String code = str(body.get("code"));
        String title = str(body.get("title"));
        if (code.isBlank() || title.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "코드와 제목은 필수입니다."));
        }
        Coupon c = new Coupon();
        applyFields(c, body);
        c.setCode(code.trim());
        c.setTitle(title.trim());
        couponRepository.save(c);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("coupon", c));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        Coupon c = couponRepository.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        if (body.get("code") != null) c.setCode(str(body.get("code")).trim());
        if (body.get("title") != null) c.setTitle(str(body.get("title")).trim());
        applyFields(c, body);
        couponRepository.save(c);
        return ResponseEntity.ok(Map.of("coupon", c));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        if (!couponRepository.existsById(id)) return ResponseEntity.notFound().build();
        couponRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private void applyFields(Coupon c, Map<String, Object> body) {
        if (body.get("description") != null) c.setDescription(str(body.get("description")));
        if (body.get("discountType") != null) {
            c.setDiscountType("percent".equals(body.get("discountType")) ? "percent" : "amount");
        }
        if (body.get("discountValue") != null) c.setDiscountValue(intOf(body.get("discountValue")));
        if (body.get("minOrderAmount") != null) c.setMinOrderAmount(intOf(body.get("minOrderAmount")));
        if (body.get("active") != null) c.setActive(Boolean.parseBoolean(String.valueOf(body.get("active"))));
        if (body.containsKey("expiresAt")) {
            Object v = body.get("expiresAt");
            c.setExpiresAt(v == null || String.valueOf(v).isBlank() ? null : String.valueOf(v));
        }
    }

    private String str(Object o) { return o == null ? "" : String.valueOf(o); }

    private int intOf(Object o) {
        try { return (int) Math.round(Double.parseDouble(String.valueOf(o))); }
        catch (NumberFormatException e) { return 0; }
    }
}
