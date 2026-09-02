package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Notification;
import com.vulnlab.shop.entity.Question;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.NotificationRepository;
import com.vulnlab.shop.repository.QuestionRepository;
import com.vulnlab.shop.security.Roles;
import jakarta.servlet.http.HttpSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/qna")
@Tag(name = "Q&A 문의", description = "상품·주문 문의 게시판")
public class QnaController {

    private final QuestionRepository questionRepository;
    private final NotificationRepository notificationRepository;

    public QnaController(QuestionRepository questionRepository, NotificationRepository notificationRepository) {
        this.questionRepository = questionRepository;
        this.notificationRepository = notificationRepository;
    }

    private Map<String, Object> toListItem(Question q) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("id", q.getId());
        m.put("title", q.getTitle());
        m.put("authorUsername", q.getUsername());
        m.put("secret", q.isSecret());
        m.put("answered", q.getAnswer() != null && !q.getAnswer().isBlank());
        m.put("createdAt", q.getCreatedAt());
        return m;
    }

    private Map<String, Object> toDetail(Question q) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("id", q.getId());
        m.put("userId", q.getUserId());
        m.put("title", q.getTitle());
        m.put("body", q.getBody());
        m.put("secret", q.isSecret());
        m.put("authorUsername", q.getUsername());
        m.put("answer", q.getAnswer());
        m.put("answeredBy", q.getAnsweredBy());
        m.put("answeredAt", q.getAnsweredAt());
        m.put("createdAt", q.getCreatedAt());
        return m;
    }

    @GetMapping
    public Map<String, Object> list(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), Math.min(50, Math.max(1, pageSize)),
                Sort.by(Sort.Direction.DESC, "id"));
        Page<Question> result = (q == null || q.isBlank())
                ? questionRepository.findAll(pageable)
                : questionRepository.findByTitleContainingIgnoreCase(q, pageable);
        java.util.List<Map<String, Object>> questions = new java.util.ArrayList<>();
        for (Question item : result.getContent()) {
            questions.add(toListItem(item));
        }
        return Map.of(
                "questions", questions,
                "total", result.getTotalElements(),
                "page", page,
                "pageSize", pageable.getPageSize());
    }

    @GetMapping("/mine")
    public ResponseEntity<?> mine(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        java.util.List<Map<String, Object>> questions = new java.util.ArrayList<>();
        for (Question item : questionRepository.findByUserIdOrderByIdDesc(user.getId())) {
            questions.add(toListItem(item));
        }
        return ResponseEntity.ok(Map.of("questions", questions));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id) {
        Question q = questionRepository.findById(id).orElse(null);
        if (q == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "문의를 찾을 수 없습니다."));
        }
        return ResponseEntity.ok(Map.of("question", toDetail(q)));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        String title = String.valueOf(body.getOrDefault("title", "")).trim();
        String text = String.valueOf(body.getOrDefault("body", "")).trim();
        Object secretRaw = body.get("secret");
        boolean secret = Boolean.TRUE.equals(secretRaw) || "true".equals(String.valueOf(secretRaw));
        if (title.isEmpty() || text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "제목과 내용은 필수입니다."));
        }
        Question q = new Question();
        q.setUserId(user.getId());
        q.setUsername(user.getUsername());
        q.setTitle(title);
        q.setBody(text);
        q.setSecret(secret);
        questionRepository.save(q);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("question", toDetail(q)));
    }

    @PutMapping("/{id}/answer")
    public ResponseEntity<?> answer(@PathVariable Long id, @RequestBody Map<String, String> body, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        if (!Roles.isAdminOrAbove(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "관리자 권한이 필요합니다."));
        }
        Question q = questionRepository.findById(id).orElse(null);
        if (q == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "문의를 찾을 수 없습니다."));
        }
        String answer = body.getOrDefault("answer", "").trim();
        if (answer.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "답변 내용은 필수입니다."));
        }
        q.setAnswer(answer);
        q.setAnsweredBy(user.getUsername());
        q.setAnsweredAt(LocalDateTime.now());
        questionRepository.save(q);
        notificationRepository.save(new Notification(q.getUserId(), "qna", "문의에 답변이 등록되었습니다",
                "\"" + q.getTitle() + "\" 문의에 답변이 달렸습니다.", "/qna/" + q.getId()));
        return ResponseEntity.ok(Map.of("question", toDetail(q)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        Question q = questionRepository.findById(id).orElse(null);
        if (q == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "문의를 찾을 수 없습니다."));
        }
        boolean isOwner = q.getUserId() != null && q.getUserId().equals(user.getId());
        boolean isAdmin = Roles.isAdminOrAbove(user.getRole());
        if (!isOwner && !isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "삭제 권한이 없습니다."));
        }
        questionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
