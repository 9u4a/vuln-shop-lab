package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Order;
import com.vulnlab.shop.entity.PointTransaction;
import com.vulnlab.shop.entity.ReturnRequest;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.OrderRepository;
import com.vulnlab.shop.repository.PointTransactionRepository;
import com.vulnlab.shop.repository.ReturnRepository;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.security.Roles;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/returns")
public class ReturnController {

    private final ReturnRepository returnRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;

    public ReturnController(ReturnRepository returnRepository, OrderRepository orderRepository,
                            UserRepository userRepository, PointTransactionRepository pointTransactionRepository) {
        this.returnRepository = returnRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
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

    // 반품/환불 요청 — 주문 소유자·상태 검증 없이 접수한다.
    @PostMapping
    public ResponseEntity<?> request(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Object rawOrderId = body.get("orderId");
        if (rawOrderId == null) return ResponseEntity.badRequest().body(Map.of("error", "주문 번호가 필요합니다."));
        Order order = orderRepository.findById(Long.valueOf(String.valueOf(rawOrderId))).orElse(null);
        if (order == null) return ResponseEntity.notFound().build();
        ReturnRequest ret = new ReturnRequest();
        ret.setOrderId(order.getId());
        ret.setUserId(user.getId());
        ret.setReason(body.get("reason") == null ? null : String.valueOf(body.get("reason")));
        ret.setStatus("requested");
        ret.setRefundAmount(order.getTotalAmount());
        returnRepository.save(ret);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", ret.getId(), "status", "requested"));
    }

    @GetMapping("/mine")
    public ResponseEntity<?> mine(HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        return ResponseEntity.ok(Map.of("returns", returnRepository.findByUserIdOrderByIdDesc(user.getId())));
    }

    @GetMapping
    public ResponseEntity<?> all(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        return ResponseEntity.ok(Map.of("returns", returnRepository.findAllByOrderByIdDesc()));
    }

    // 관리자 환불 승인 — 이미 환불된 건에 대한 재승인을 막지 않는다.
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        ReturnRequest ret = returnRepository.findById(id).orElse(null);
        if (ret == null) return ResponseEntity.notFound().build();
        ret.setStatus("refunded");
        returnRepository.save(ret);
        int refund = ret.getRefundAmount().intValue();
        userRepository.findById(ret.getUserId()).ifPresent(u -> {
            u.setPoints(u.getPoints() + refund);
            userRepository.save(u);
        });
        pointTransactionRepository.save(new PointTransaction(ret.getUserId(), refund, "반품 환불", ret.getOrderId()));
        return ResponseEntity.ok(Map.of("ok", true, "status", "refunded", "refundAmount", refund));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        ReturnRequest ret = returnRepository.findById(id).orElse(null);
        if (ret == null) return ResponseEntity.notFound().build();
        ret.setStatus("rejected");
        returnRepository.save(ret);
        return ResponseEntity.ok(Map.of("ok", true, "status", "rejected"));
    }
}
