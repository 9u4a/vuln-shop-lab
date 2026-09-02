package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.GiftCard;
import com.vulnlab.shop.entity.PointTransaction;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.GiftCardRepository;
import com.vulnlab.shop.repository.PointTransactionRepository;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.security.Roles;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/giftcards")
@Tag(name = "상품권", description = "상품권 잔액 조회·등록(적립금 전환) 및 관리(관리자)")
public class GiftCardController {

    private final GiftCardRepository giftCardRepository;
    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;

    public GiftCardController(GiftCardRepository giftCardRepository, UserRepository userRepository,
                              PointTransactionRepository pointTransactionRepository) {
        this.giftCardRepository = giftCardRepository;
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
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

    // 코드로 상품권 잔액 조회.
    @GetMapping("/lookup/{code}")
    public ResponseEntity<?> lookup(@PathVariable String code, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        GiftCard card = giftCardRepository.findByCode(code.trim()).orElse(null);
        if (card == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "상품권을 찾을 수 없습니다."));
        }
        return ResponseEntity.ok(Map.of("giftCard", card));
    }

    // 상품권 등록 — 잔액을 적립금(포인트)으로 전환.
    @PostMapping("/redeem")
    public ResponseEntity<?> redeem(@RequestBody Map<String, Object> body, HttpSession session) {
        User sessionUser = (User) session.getAttribute("user");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        String code = str(body.get("code")).trim();
        if (code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "상품권 코드를 입력해주세요."));
        }
        GiftCard card = giftCardRepository.findByCode(code).orElse(null);
        if (card == null || !card.isActive()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "유효하지 않은 상품권입니다."));
        }
        if (card.getExpiresAt() != null && card.getExpiresAt().compareTo(Instant.now().toString()) < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "만료된 상품권입니다."));
        }
        int amount = card.getBalance();
        User user = userRepository.findById(sessionUser.getId()).orElseThrow();
        user.setPoints(user.getPoints() + amount);
        userRepository.save(user);
        pointTransactionRepository.save(new PointTransaction(user.getId(), amount, "상품권 등록 (" + code + ")", null));
        return ResponseEntity.ok(Map.of("ok", true, "credited", amount));
    }

    // 관리자 — 상품권 발행/관리.
    @GetMapping("/manage")
    public ResponseEntity<?> manage(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        List<GiftCard> cards = new ArrayList<>(giftCardRepository.findAll());
        cards.sort((a, b) -> b.getId().compareTo(a.getId()));
        return ResponseEntity.ok(Map.of("giftCards", cards));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        String code = str(body.get("code")).trim();
        if (code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "코드는 필수입니다."));
        }
        int amount = intOf(body.get("balance"));
        GiftCard c = new GiftCard();
        c.setCode(code);
        c.setBalance(amount);
        c.setInitialBalance(amount);
        c.setActive(body.get("active") == null || Boolean.parseBoolean(String.valueOf(body.get("active"))));
        c.setExpiresAt(blankToNull(body.get("expiresAt")));
        giftCardRepository.save(c);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("giftCard", c));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        GiftCard c = giftCardRepository.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        if (body.get("code") != null) c.setCode(str(body.get("code")).trim());
        if (body.get("balance") != null) c.setBalance(intOf(body.get("balance")));
        if (body.get("active") != null) c.setActive(Boolean.parseBoolean(String.valueOf(body.get("active"))));
        if (body.containsKey("expiresAt")) c.setExpiresAt(blankToNull(body.get("expiresAt")));
        giftCardRepository.save(c);
        return ResponseEntity.ok(Map.of("giftCard", c));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        if (!giftCardRepository.existsById(id)) return ResponseEntity.notFound().build();
        giftCardRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private String str(Object o) { return o == null ? "" : String.valueOf(o); }

    private String blankToNull(Object o) {
        return o == null || String.valueOf(o).isBlank() ? null : String.valueOf(o);
    }

    private int intOf(Object o) {
        try { return (int) Math.round(Double.parseDouble(String.valueOf(o))); }
        catch (NumberFormatException e) { return 0; }
    }
}
