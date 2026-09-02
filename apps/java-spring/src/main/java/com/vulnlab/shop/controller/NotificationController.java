package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Notification;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.NotificationRepository;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.security.Roles;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "알림", description = "인앱 알림 목록·읽음 및 관리자 브로드캐스트")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    private User currentUser(HttpSession session) {
        return (User) session.getAttribute("user");
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        return ResponseEntity.ok(Map.of("notifications",
                notificationRepository.findTop50ByUserIdOrderByIdDesc(user.getId())));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        return ResponseEntity.ok(Map.of("count", notificationRepository.countByUserIdAndReadAtIsNull(user.getId())));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> read(@PathVariable Long id, HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getUserId().equals(user.getId())) {
                n.setReadAt(LocalDateTime.now());
                notificationRepository.save(n);
            }
        });
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> readAll(HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        List<Notification> unread = notificationRepository.findByUserIdAndReadAtIsNull(user.getId());
        for (Notification n : unread) {
            n.setReadAt(LocalDateTime.now());
        }
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/broadcast")
    public ResponseEntity<?> broadcast(@RequestBody Map<String, String> body, HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        if (!Roles.isAdminOrAbove(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "관리자 권한이 필요합니다."));
        }
        String title = body.get("title");
        if (title == null || title.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "제목은 필수입니다."));
        }
        String text = body.get("body");
        String link = body.get("link");
        int sent = 0;
        for (User u : userRepository.findAll()) {
            notificationRepository.save(new Notification(u.getId(), "notice", title, text, link));
            sent++;
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("ok", true, "sent", sent));
    }
}
