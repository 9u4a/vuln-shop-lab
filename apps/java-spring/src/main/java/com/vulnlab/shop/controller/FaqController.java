package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Faq;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.FaqRepository;
import com.vulnlab.shop.security.Roles;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/faqs")
public class FaqController {

    private final FaqRepository faqRepository;

    public FaqController(FaqRepository faqRepository) {
        this.faqRepository = faqRepository;
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
        List<Faq> faqs = faqRepository.findAll();
        faqs.sort((a, b) -> a.getId().compareTo(b.getId()));
        return Map.of("faqs", faqs);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        String question = body.getOrDefault("question", "").trim();
        String answer = body.getOrDefault("answer", "").trim();
        if (question.isEmpty() || answer.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "question and answer are required."));
        }
        Faq faq = new Faq();
        faq.setQuestion(question);
        faq.setAnswer(answer);
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
