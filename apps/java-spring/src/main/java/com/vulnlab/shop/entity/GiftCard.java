package com.vulnlab.shop.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import java.time.LocalDateTime;

@Entity
@Table(name = "gift_cards")
public class GiftCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    @ColumnDefault("0")
    private int balance = 0;

    @Column(name = "initial_balance", nullable = false)
    @ColumnDefault("0")
    private int initialBalance = 0;

    @Column(nullable = false)
    @ColumnDefault("true")
    private boolean active = true;

    @Column(name = "expires_at")
    private String expiresAt;

    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public int getBalance() { return balance; }
    public void setBalance(int balance) { this.balance = balance; }

    public int getInitialBalance() { return initialBalance; }
    public void setInitialBalance(int initialBalance) { this.initialBalance = initialBalance; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getExpiresAt() { return expiresAt; }
    public void setExpiresAt(String expiresAt) { this.expiresAt = expiresAt; }

    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
