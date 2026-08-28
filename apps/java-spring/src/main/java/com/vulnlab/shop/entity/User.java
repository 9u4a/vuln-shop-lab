package com.vulnlab.shop.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role = "user";

    @Column(length = 1000)
    private String bio;

    @Column(name = "avatar_url")
    private String avatarUrl;

    private String name;

    private String phone;

    private String postcode;

    private String address;

    @Column(name = "address_detail")
    private String addressDetail;

    @Column(nullable = false)
    @ColumnDefault("true")
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    @JsonIgnore
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getPostcode() { return postcode; }
    public void setPostcode(String postcode) { this.postcode = postcode; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getAddressDetail() { return addressDetail; }
    public void setAddressDetail(String addressDetail) { this.addressDetail = addressDetail; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
