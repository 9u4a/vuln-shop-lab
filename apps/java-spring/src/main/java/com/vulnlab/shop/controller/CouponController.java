package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Coupon;
import com.vulnlab.shop.entity.Notification;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.entity.UserCoupon;
import com.vulnlab.shop.repository.CouponRepository;
import com.vulnlab.shop.repository.NotificationRepository;
import com.vulnlab.shop.repository.UserCouponRepository;
import com.vulnlab.shop.security.Roles;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "쿠폰", description = "쿠폰 조회·발급(로그인) 및 관리(관리자 전용 오퍼레이션 포함)")
public class CouponController {

    private final CouponRepository couponRepository;
    private final UserCouponRepository userCouponRepository;
    private final NotificationRepository notificationRepository;

    public CouponController(CouponRepository couponRepository, UserCouponRepository userCouponRepository,
                            NotificationRepository notificationRepository) {
        this.couponRepository = couponRepository;
        this.userCouponRepository = userCouponRepository;
        this.notificationRepository = notificationRepository;
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

    // 체크아웃 쿠폰 미리보기 — 유효성·할인액만 계산(사용 처리는 주문 생성 시).
    @PostMapping("/apply-preview")
    public ResponseEntity<?> applyPreview(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        String code = str(body.get("code")).trim();
        long itemsTotal = intOf(body.get("itemsTotal"));
        if (code.isBlank()) {
            return ResponseEntity.ok(Map.of("valid", false, "discountAmount", 0, "reason", "쿠폰 코드를 입력해주세요."));
        }
        Coupon coupon = null;
        for (UserCoupon uc : userCouponRepository.findByUserIdOrderByIdDesc(user.getId())) {
            Coupon c = couponRepository.findById(uc.getCouponId()).orElse(null);
            if (c != null && code.equals(c.getCode())) { coupon = c; break; }
        }
        if (coupon == null) return ResponseEntity.ok(Map.of("valid", false, "discountAmount", 0, "reason", "보유하지 않은 쿠폰입니다."));
        if (!coupon.isActive()) return ResponseEntity.ok(Map.of("valid", false, "discountAmount", 0, "reason", "사용할 수 없는 쿠폰입니다."));
        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().compareTo(Instant.now().toString()) < 0) {
            return ResponseEntity.ok(Map.of("valid", false, "discountAmount", 0, "reason", "만료된 쿠폰입니다."));
        }
        if (itemsTotal < coupon.getMinOrderAmount()) {
            return ResponseEntity.ok(Map.of("valid", false, "discountAmount", 0,
                    "reason", "최소 주문금액 " + coupon.getMinOrderAmount() + "원 이상부터 사용 가능합니다."));
        }
        long discount = "percent".equals(coupon.getDiscountType())
                ? (itemsTotal * coupon.getDiscountValue()) / 100
                : coupon.getDiscountValue();
        Map<String, Object> ok = new HashMap<>();
        ok.put("valid", true);
        ok.put("discountAmount", Math.min(discount, itemsTotal));
        ok.put("reason", null);
        return ResponseEntity.ok(ok);
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
        notificationRepository.save(new Notification(user.getId(), "coupon", "쿠폰이 발급되었습니다",
                coupon.getTitle() + " 쿠폰을 받았습니다.", "/mypage/rewards"));
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
