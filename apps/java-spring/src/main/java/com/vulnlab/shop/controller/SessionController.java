package com.vulnlab.shop.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
public class SessionController {

    @GetMapping("/api/session")
    public Map<String, Object> session(HttpSession session) {
        return Collections.singletonMap("user", session.getAttribute("user"));
    }
}
