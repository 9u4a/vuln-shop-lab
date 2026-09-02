package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.LoginLog;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.LoginLogRepository;
import com.vulnlab.shop.security.JwtSupport;
import com.vulnlab.shop.service.AuthService;
import io.jsonwebtoken.Claims;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "인증", description = "회원가입·로그인·로그아웃 (세션 쿠키)")
public class AuthController {

    private final AuthService authService;
    private final LoginLogRepository loginLogRepository;
    private final JwtSupport jwtSupport;

    public AuthController(AuthService authService, LoginLogRepository loginLogRepository, JwtSupport jwtSupport) {
        this.authService = authService;
        this.loginLogRepository = loginLogRepository;
        this.jwtSupport = jwtSupport;
    }

    @Operation(summary = "회원가입", description = "username, password, name, phone, postcode, address 필수. addressDetail, referralCode 선택.")
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String name = body.get("name");
        String phone = body.get("phone");
        String email = body.get("email");
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
        authService.signup(username, password, name, phone, email, postcode, address, addressDetail, referralCode);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("ok", true));
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    @Operation(summary = "로그인", description = "{ username, password } 본문. 성공 시 세션 쿠키(JSESSIONID) 발급.")
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

    @Operation(summary = "로그아웃", description = "세션 무효화")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @Operation(summary = "비밀번호 찾기", description = "{ account } — 아이디 또는 이메일. 재설정 토큰 발급.")
    @PostMapping("/forgot")
    public ResponseEntity<?> forgot(@RequestBody Map<String, String> body) {
        String account = body.get("account");
        if (isBlank(account)) {
            return ResponseEntity.badRequest().body(Map.of("error", "아이디 또는 이메일을 입력해주세요."));
        }
        Optional<User> found = authService.findByAccount(account);
        if (found.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "가입된 계정을 찾을 수 없습니다."));
        }
        String resetToken = authService.issueResetToken(found.get());
        Map<String, Object> res = new HashMap<>();
        res.put("ok", true);
        res.put("message", "비밀번호 재설정 링크를 발송했습니다.");
        res.put("resetToken", resetToken);
        return ResponseEntity.ok(res);
    }

    @Operation(summary = "비밀번호 재설정", description = "{ token, newPassword(8자+) }")
    @PostMapping("/reset")
    public ResponseEntity<?> reset(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");
        if (isBlank(token) || newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "토큰과 새 비밀번호(최소 8자)를 입력해주세요."));
        }
        Optional<User> found = authService.findByResetToken(token);
        if (found.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "유효하지 않은 토큰입니다."));
        }
        authService.resetPassword(found.get(), newPassword);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @Operation(summary = "API 토큰 발급(JWT)", description = "로그인 세션으로 Bearer 토큰 발급")
    @PostMapping("/token")
    public ResponseEntity<?> token(HttpSession session) {
        User sessionUser = (User) session.getAttribute("user");
        if (sessionUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        String token = jwtSupport.issue(sessionUser);
        return ResponseEntity.ok(Map.of("token", token, "tokenType", "Bearer"));
    }

    @Operation(summary = "토큰 신원 확인", description = "Authorization: Bearer <JWT> 의 클레임을 반환")
    @GetMapping("/whoami")
    public ResponseEntity<?> whoami(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Bearer 토큰이 필요합니다."));
        }
        try {
            Claims claims = jwtSupport.parse(authorization.substring(7));
            Map<String, Object> res = new HashMap<>();
            res.put("id", claims.getSubject());
            res.put("username", claims.get("username"));
            res.put("role", claims.get("role"));
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "유효하지 않은 토큰입니다."));
        }
    }
}
