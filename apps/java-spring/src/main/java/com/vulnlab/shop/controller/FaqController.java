package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Faq;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.FaqRepository;
import com.vulnlab.shop.security.Roles;
import com.vulnlab.shop.vuln.TemplateRenderer;
import jakarta.servlet.http.HttpSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/faqs")
public class FaqController {

    private final FaqRepository faqRepository;

    public FaqController(FaqRepository faqRepository) {
        this.faqRepository = faqRepository;
    }

    private ResponseEntity<?> requireAuth(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        return null;
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
                Sort.by(Sort.Direction.ASC, "id"));
        Page<Faq> result = (q == null || q.isBlank())
                ? faqRepository.findAll(pageable)
                : faqRepository.findByQuestionContainingIgnoreCaseOrAnswerContainingIgnoreCase(q, q, pageable);
        java.util.List<Map<String, Object>> faqs = new java.util.ArrayList<>();
        for (Faq f : result.getContent()) {
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("id", f.getId());
            m.put("question", f.getQuestion());
            m.put("answer", TemplateRenderer.render(f.getAnswer()));
            m.put("authorUsername", f.getAuthorUsername());
            m.put("userId", f.getUserId());
            m.put("createdAt", f.getCreatedAt());
            faqs.add(m);
        }
        return Map.of(
                "faqs", faqs,
                "total", result.getTotalElements(),
                "page", page,
                "pageSize", pageable.getPageSize());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireAuth(session);
        if (denied != null) return denied;
        String question = body.getOrDefault("question", "").trim();
        String answer = body.getOrDefault("answer", "").trim();
        if (question.isEmpty() || answer.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "질문과 답변은 필수입니다."));
        }
        User user = (User) session.getAttribute("user");
        Faq faq = new Faq();
        faq.setQuestion(question);
        faq.setAnswer(answer);
        faq.setUserId(user.getId());
        faq.setAuthorUsername(user.getUsername());
        faqRepository.save(faq);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("faq", faq));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        Faq faq = faqRepository.findById(id).orElse(null);
        if (faq == null) return ResponseEntity.notFound().build();
        if (body.get("question") != null) faq.setQuestion(body.get("question").trim());
        if (body.get("answer") != null) faq.setAnswer(body.get("answer").trim());
        faqRepository.save(faq);
        return ResponseEntity.ok(Map.of("faq", faq));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        if (!faqRepository.existsById(id)) return ResponseEntity.notFound().build();
        faqRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
