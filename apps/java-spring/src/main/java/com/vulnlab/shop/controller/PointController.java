package com.vulnlab.shop.controller;

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
@RequestMapping("/api/points")
@Tag(name = "포인트", description = "적립금 잔액·원장 조회 (로그인 필요)")
@SecurityRequirement(name = "sessionCookie")
public class PointController {

    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;

    public PointController(UserRepository userRepository, PointTransactionRepository pointTransactionRepository) {
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
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
}
