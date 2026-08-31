package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Notice;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.NoticeRepository;
import com.vulnlab.shop.security.Roles;
import com.vulnlab.shop.vuln.TemplateRenderer;
import jakarta.servlet.http.HttpSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notices")
@Tag(name = "공지사항", description = "공지 조회(공개) 및 관리(관리자 전용 오퍼레이션 포함)")
public class NoticeController {

    private final NoticeRepository noticeRepository;

    public NoticeController(NoticeRepository noticeRepository) {
        this.noticeRepository = noticeRepository;
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

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(50, Math.max(1, pageSize)),
                Sort.by(Sort.Direction.DESC, "id"));
        Page<Notice> result = (q == null || q.isBlank())
                ? noticeRepository.findAll(pageable)
                : noticeRepository.findByTitleContainingIgnoreCaseOrBodyContainingIgnoreCase(q, q, pageable);
        java.util.List<Map<String, Object>> notices = new java.util.ArrayList<>();
        for (Notice n : result.getContent()) {
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", n.getId());
            m.put("title", n.getTitle());
            m.put("body", TemplateRenderer.render(n.getBody()));
            m.put("imageUrl", n.getImageUrl());
            m.put("createdAt", n.getCreatedAt());
            notices.add(m);
        }
        return Map.of(
                "notices", notices,
                "total", result.getTotalElements(),
                "page", page,
                "pageSize", pageable.getPageSize());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id) {
        Notice n = noticeRepository.findById(id).orElse(null);
        if (n == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "공지사항을 찾을 수 없습니다."));
        }
        java.util.Map<String, Object> m = new java.util.HashMap<>();
        m.put("id", n.getId());
        m.put("title", n.getTitle());
        m.put("body", TemplateRenderer.render(n.getBody()));
        m.put("imageUrl", n.getImageUrl());
        m.put("createdAt", n.getCreatedAt());
        return ResponseEntity.ok(Map.of("notice", m));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        String title = body.getOrDefault("title", "").trim();
        String text = body.getOrDefault("body", "").trim();
        if (title.isEmpty() || text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "제목과 내용은 필수입니다."));
        }
        Notice notice = new Notice();
        notice.setTitle(title);
        notice.setBody(text);
        notice.setImageUrl(body.get("imageUrl"));
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
        if (body.containsKey("imageUrl")) notice.setImageUrl(body.get("imageUrl"));
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
