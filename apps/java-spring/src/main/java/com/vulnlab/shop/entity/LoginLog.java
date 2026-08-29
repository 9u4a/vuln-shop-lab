package com.vulnlab.shop.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import java.time.LocalDateTime;

@Entity
@Table(name = "login_logs")
public class LoginLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    private String username;

    private String ip;

    @Column(name = "user_agent", length = 1000)
    private String userAgent;

    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean success = false;

    @Column(name = "at", nullable = false)
    private LocalDateTime at = LocalDateTime.now();

    public LoginLog() {}

    public LoginLog(Long userId, String username, String ip, String userAgent, boolean success) {
        this.userId = userId;
        this.username = username;
        this.ip = ip;
        this.userAgent = userAgent;
        this.success = success;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public LocalDateTime getAt() { return at; }
    public void setAt(LocalDateTime at) { this.at = at; }
}
