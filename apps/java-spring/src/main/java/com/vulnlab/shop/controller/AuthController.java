package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.LoginLog;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.LoginLogRepository;
import com.vulnlab.shop.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final LoginLogRepository loginLogRepository;

    public AuthController(AuthService authService, LoginLogRepository loginLogRepository) {
        this.authService = authService;
        this.loginLogRepository = loginLogRepository;
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
        String referralCode = body.get("referralCode");
        if (isBlank(username) || isBlank(password) || isBlank(name) || isBlank(phone)
                || isBlank(postcode) || isBlank(address)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "아이디, 비밀번호, 이름, 전화번호, 주소는 필수입니다."));
        }
        if (authService.usernameTaken(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "이미 사용 중인 아이디입니다."));
        }
        authService.signup(username, password, name, phone, postcode, address, addressDetail, referralCode);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("ok", true));
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpSession session,
                                    HttpServletRequest request) {
        String username = body.get("username");
        String password = body.get("password");
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");

        Optional<User> found = authService.findByUsername(username);
        if (found.isEmpty() || !authService.passwordMatches(found.get(), password)) {
            loginLogRepository.save(new LoginLog(found.map(User::getId).orElse(null), username, ip, userAgent, false));
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "아이디 또는 비밀번호가 올바르지 않습니다."));
        }
        User user = found.get();
        if (!user.isActive()) {
            loginLogRepository.save(new LoginLog(user.getId(), username, ip, userAgent, false));
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "비활성화된 계정입니다. 관리자에게 문의하세요."));
        }
        loginLogRepository.save(new LoginLog(user.getId(), username, ip, userAgent, true));
        session.setAttribute("user", user);
        return ResponseEntity.ok(Map.of("user", user));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
