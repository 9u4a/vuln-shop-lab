package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.storage.Uploads;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    private User currentUser(HttpSession session) {
        return (User) session.getAttribute("user");
    }

    @GetMapping
    public ResponseEntity<?> get(HttpSession session) {
        User sessionUser = currentUser(session);
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        User user = userRepository.findById(sessionUser.getId()).orElseThrow();
        return ResponseEntity.ok(Map.of("profile", user));
    }

    @PutMapping
    public ResponseEntity<?> update(@RequestBody Map<String, String> body, HttpSession session) {
        User sessionUser = currentUser(session);
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        User user = userRepository.findById(sessionUser.getId()).orElseThrow();
        user.setBio(body.get("bio"));
        userRepository.save(user);
        session.setAttribute("user", user);
        return ResponseEntity.ok(Map.of("profile", user));
    }

    @PutMapping("/password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body, HttpSession session) {
        User sessionUser = currentUser(session);
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        if (currentPassword == null || newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Current password and a new password (min 8 characters) are required."));
        }
        User user = userRepository.findById(sessionUser.getId()).orElseThrow();
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Current password is incorrect."));
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/verify-password")
    public ResponseEntity<?> verifyPassword(@RequestBody Map<String, String> body, HttpSession session) {
        User sessionUser = currentUser(session);
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        String password = body.get("password");
        if (password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password is required."));
        }
        User user = userRepository.findById(sessionUser.getId()).orElseThrow();
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Password is incorrect."));
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("avatar") MultipartFile file, HttpSession session) throws IOException {
        User sessionUser = currentUser(session);
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        if (!Uploads.isAllowed(file)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or missing image file."));
        }
        String filename = Uploads.store(file);

        User user = userRepository.findById(sessionUser.getId()).orElseThrow();
        user.setAvatarUrl(filename);
        userRepository.save(user);
        session.setAttribute("user", user);
        return ResponseEntity.ok(Map.of("avatarUrl", filename));
    }
}
