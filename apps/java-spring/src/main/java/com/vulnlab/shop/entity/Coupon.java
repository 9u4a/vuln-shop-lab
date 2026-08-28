package com.vulnlab.shop.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import java.time.LocalDateTime;

@Entity
@Table(name = "coupons")
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(name = "discount_type", nullable = false)
    private String discountType = "amount";

    @Column(name = "discount_value", nullable = false)
    @ColumnDefault("0")
    private int discountValue = 0;

    @Column(name = "min_order_amount", nullable = false)
    @ColumnDefault("0")
    private int minOrderAmount = 0;

    @Column(nullable = false)
    @ColumnDefault("true")
    private boolean active = true;

    @Column(name = "expires_at")
    private String expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Transient
    private Boolean claimed;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDiscountType() { return discountType; }
    public void setDiscountType(String discountType) { this.discountType = discountType; }

    public int getDiscountValue() { return discountValue; }
    public void setDiscountValue(int discountValue) { this.discountValue = discountValue; }

    public int getMinOrderAmount() { return minOrderAmount; }
    public void setMinOrderAmount(int minOrderAmount) { this.minOrderAmount = minOrderAmount; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Boolean getClaimed() { return claimed; }
    public void setClaimed(Boolean claimed) { this.claimed = claimed; }
}
