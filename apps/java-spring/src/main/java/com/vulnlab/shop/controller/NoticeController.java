package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Notice;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.NoticeRepository;
import com.vulnlab.shop.security.Roles;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notices")
public class NoticeController {

    private final NoticeRepository noticeRepository;

    public NoticeController(NoticeRepository noticeRepository) {
        this.noticeRepository = noticeRepository;
    }

    private ResponseEntity<?> requireAdmin(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        if (!Roles.isAdminOrAbove(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }
        return null;
    }

    @GetMapping
    public Map<String, Object> list() {
        List<Notice> notices = noticeRepository.findAll();
        notices.sort((a, b) -> b.getId().compareTo(a.getId()));
        return Map.of("notices", notices);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        String title = body.getOrDefault("title", "").trim();
        String text = body.getOrDefault("body", "").trim();
        if (title.isEmpty() || text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "title and body are required."));
        }
        Notice notice = new Notice();
        notice.setTitle(title);
        notice.setBody(text);
        noticeRepository.save(notice);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("notice", notice));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        Notice notice = noticeRepository.findById(id).orElse(null);
        if (notice == null) return ResponseEntity.notFound().build();
        if (body.get("title") != null) notice.setTitle(body.get("title").trim());
        if (body.get("body") != null) notice.setBody(body.get("body").trim());
        noticeRepository.save(notice);
        return ResponseEntity.ok(Map.of("notice", notice));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        if (!noticeRepository.existsById(id)) return ResponseEntity.notFound().build();
        noticeRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
