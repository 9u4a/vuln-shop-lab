package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private static final Set<String> ALLOWED_EXT = Set.of("png", "jpg", "jpeg", "gif", "webp");
    private static final Path UPLOAD_DIR = Paths.get("uploads");

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

    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("avatar") MultipartFile file, HttpSession session) throws IOException {
        User sessionUser = currentUser(session);
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.') + 1).toLowerCase() : "";
        if (file.isEmpty() || !ALLOWED_EXT.contains(ext)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or missing image file."));
        }

        Files.createDirectories(UPLOAD_DIR);
        String filename = UUID.randomUUID() + "." + ext;
        Files.copy(file.getInputStream(), UPLOAD_DIR.resolve(filename));

        User user = userRepository.findById(sessionUser.getId()).orElseThrow();
        user.setAvatarUrl(filename);
        userRepository.save(user);
        session.setAttribute("user", user);
        return ResponseEntity.ok(Map.of("avatarUrl", filename));
    }
}
