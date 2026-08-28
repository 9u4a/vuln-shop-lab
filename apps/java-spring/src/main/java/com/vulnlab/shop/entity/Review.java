package com.vulnlab.shop.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private int rating;

    @Column(nullable = false, length = 2000)
    private String body;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean secret = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public boolean isSecret() { return secret; }
    public void setSecret(boolean secret) { this.secret = secret; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
