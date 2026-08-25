package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.service.AuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String name = body.get("name");
        String phone = body.get("phone");
        String postcode = body.get("postcode");
        String address = body.get("address");
        String addressDetail = body.get("addressDetail");
        if (isBlank(username) || isBlank(password) || isBlank(name) || isBlank(phone)
                || isBlank(postcode) || isBlank(address)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "아이디, 비밀번호, 이름, 전화번호, 주소는 필수입니다."));
        }
        if (authService.usernameTaken(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "이미 사용 중인 아이디입니다."));
        }
        authService.signup(username, password, name, phone, postcode, address, addressDetail);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("ok", true));
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpSession session) {
        String username = body.get("username");
        String password = body.get("password");
        Optional<User> user = authService.login(username, password);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "아이디 또는 비밀번호가 올바르지 않습니다."));
        }
        session.setAttribute("user", user.get());
        return ResponseEntity.ok(Map.of("user", user.get()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
