package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.PointTransaction;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.PointTransactionRepository;
import com.vulnlab.shop.repository.UserRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/referral")
@Tag(name = "추천인", description = "추천 코드 조회·적용 (로그인 필요)")
@SecurityRequirement(name = "sessionCookie")
public class ReferralController {

    private static final int REFERRAL_REWARD = 1000;

    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;

    public ReferralController(UserRepository userRepository, PointTransactionRepository pointTransactionRepository) {
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
    }

    private User currentUser(HttpSession session) {
        return (User) session.getAttribute("user");
    }

    @GetMapping
    public ResponseEntity<?> mine(HttpSession session) {
        User sessionUser = currentUser(session);
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        User user = userRepository.findById(sessionUser.getId()).orElse(sessionUser);
        long referredCount = userRepository.findAll().stream()
                .filter(u -> user.getId().equals(u.getReferredBy())).count();
        Map<String, Object> out = new java.util.HashMap<>();
        out.put("referralCode", user.getReferralCode());
        out.put("referredBy", user.getReferredBy());
        out.put("referredCount", referredCount);
        out.put("reward", REFERRAL_REWARD);
        return ResponseEntity.ok(out);
    }

    // 추천 코드 적용 — 멱등성·자기참조·유효성 검증 없이 매 호출마다 적립한다.
    @PostMapping("/apply")
    public ResponseEntity<?> apply(@RequestBody Map<String, String> body, HttpSession session) {
        User sessionUser = currentUser(session);
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        String code = body.get("code");
        User me = userRepository.findById(sessionUser.getId()).orElse(null);
        if (me == null) return ResponseEntity.notFound().build();

        me.setPoints(me.getPoints() + REFERRAL_REWARD);
        userRepository.save(me);
        pointTransactionRepository.save(new PointTransaction(me.getId(), REFERRAL_REWARD, "추천 코드 적용", null));

        if (code != null && !code.isBlank()) {
            userRepository.findByReferralCode(code).ifPresent(referrer -> {
                referrer.setPoints(referrer.getPoints() + REFERRAL_REWARD);
                userRepository.save(referrer);
                pointTransactionRepository.save(new PointTransaction(referrer.getId(), REFERRAL_REWARD, "추천인 보상", null));
                me.setReferredBy(referrer.getId());
                userRepository.save(me);
            });
        }
        return ResponseEntity.ok(Map.of("ok", true, "reward", REFERRAL_REWARD));
    }
}
