package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Event;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.EventRepository;
import com.vulnlab.shop.security.Roles;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventRepository eventRepository;

    public EventController(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
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

    // Public — active events currently within their publish window.
    @GetMapping
    public Map<String, Object> list() {
        String now = LocalDateTime.now().toString();
        List<Event> events = eventRepository.findAll().stream()
                .filter(Event::isActive)
                .filter(e -> e.getStartsAt() == null || e.getStartsAt().isBlank() || e.getStartsAt().compareTo(now) <= 0)
                .filter(e -> e.getEndsAt() == null || e.getEndsAt().isBlank() || e.getEndsAt().compareTo(now) >= 0)
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .toList();
        return Map.of("events", events);
    }

    // Admin — every event.
    @GetMapping("/manage")
    public ResponseEntity<?> manage(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        List<Event> events = eventRepository.findAll().stream()
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .toList();
        return ResponseEntity.ok(Map.of("events", events));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        String title = str(body.get("title"));
        if (title == null || title.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "제목은 필수입니다."));
        }
        Event event = new Event();
        event.setTitle(title.trim());
        event.setBody(str(body.get("body")));
        event.setImageUrl(str(body.get("imageUrl")));
        event.setLinkUrl(str(body.get("linkUrl")));
        Object active = body.get("active");
        event.setActive(active == null || Boolean.parseBoolean(String.valueOf(active)));
        event.setStartsAt(str(body.get("startsAt")));
        event.setEndsAt(str(body.get("endsAt")));
        eventRepository.save(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("event", event));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        Event event = eventRepository.findById(id).orElse(null);
        if (event == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "이벤트를 찾을 수 없습니다."));
        }
        if (body.containsKey("title") && str(body.get("title")) != null) event.setTitle(str(body.get("title")).trim());
        if (body.containsKey("body")) event.setBody(str(body.get("body")));
        if (body.containsKey("imageUrl")) event.setImageUrl(str(body.get("imageUrl")));
        if (body.containsKey("linkUrl")) event.setLinkUrl(str(body.get("linkUrl")));
        if (body.containsKey("active")) event.setActive(Boolean.parseBoolean(String.valueOf(body.get("active"))));
        if (body.containsKey("startsAt")) event.setStartsAt(str(body.get("startsAt")));
        if (body.containsKey("endsAt")) event.setEndsAt(str(body.get("endsAt")));
        eventRepository.save(event);
        return ResponseEntity.ok(Map.of("event", event));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        if (!eventRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "이벤트를 찾을 수 없습니다."));
        }
        eventRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private static String str(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o);
        return s.isEmpty() ? null : s;
    }
}
