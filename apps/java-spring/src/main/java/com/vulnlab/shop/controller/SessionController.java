package com.vulnlab.shop.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
@Tag(name = "세션", description = "현재 로그인 상태 조회")
public class SessionController {

    @GetMapping("/api/session")
    public Map<String, Object> session(HttpSession session) {
        return Collections.singletonMap("user", session.getAttribute("user"));
    }
}
