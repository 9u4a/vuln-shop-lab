package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Notification;
import com.vulnlab.shop.entity.PointTransaction;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.NotificationRepository;
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
@RequestMapping("/api/points")
@Tag(name = "포인트", description = "적립금 잔액·원장 조회 (로그인 필요)")
@SecurityRequirement(name = "sessionCookie")
public class PointController {

    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final NotificationRepository notificationRepository;

    public PointController(UserRepository userRepository, PointTransactionRepository pointTransactionRepository,
                           NotificationRepository notificationRepository) {
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public ResponseEntity<?> mine(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        int balance = userRepository.findById(user.getId()).map(User::getPoints).orElse(0);
        return ResponseEntity.ok(Map.of(
                "balance", balance,
                "transactions", pointTransactionRepository.findByUserIdOrderByIdDesc(user.getId())));
    }

    // 포인트 선물 — 보내는 사람 잔액을 확인한 뒤 받는 사람에게 이체한다.
    @PostMapping("/gift")
    public ResponseEntity<?> gift(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        Object toUsername = body.get("toUsername");
        int value = body.get("amount") == null ? 0 : (int) Math.floor(Double.parseDouble(String.valueOf(body.get("amount"))));
        Long fromUserId = body.get("fromUserId") != null ? Long.valueOf(String.valueOf(body.get("fromUserId"))) : user.getId();
        if (toUsername == null || String.valueOf(toUsername).isBlank() || value <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "받는 사람과 1 이상의 포인트를 입력해주세요."));
        }

        User sender = userRepository.findById(fromUserId).orElse(null);
        if (sender == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "보내는 사람을 찾을 수 없습니다."));
        String to = String.valueOf(toUsername);
        User recipient = userRepository.findByUsernameOrEmail(to, to).orElse(null);
        if (recipient == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "받는 사람을 찾을 수 없습니다."));
        if (recipient.getId().equals(sender.getId())) {
            return ResponseEntity.badRequest().body(Map.of("error", "자기 자신에게는 선물할 수 없습니다."));
        }
        if (sender.getPoints() < value) {
            return ResponseEntity.badRequest().body(Map.of("error", "보유 포인트가 부족합니다."));
        }

        sender.setPoints(sender.getPoints() - value);
        userRepository.save(sender);
        pointTransactionRepository.save(new PointTransaction(sender.getId(), -value, "선물 발신 → " + recipient.getUsername(), null));
        recipient.setPoints(recipient.getPoints() + value);
        userRepository.save(recipient);
        pointTransactionRepository.save(new PointTransaction(recipient.getId(), value, "선물 수신 ← " + sender.getUsername(), null));

        notificationRepository.save(new Notification(recipient.getId(), "point", "포인트를 선물받았습니다",
                sender.getUsername() + "님이 " + value + "P를 선물했어요.", "/mypage/rewards"));
        return ResponseEntity.ok(Map.of("ok", true, "sent", value, "to", recipient.getUsername()));
    }
}
