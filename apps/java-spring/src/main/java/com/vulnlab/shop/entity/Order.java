package com.vulnlab.shop.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String status = "pending";

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "webhook_url")
    private String webhookUrl;

    @Column(name = "toss_order_id", unique = true)
    private String tossOrderId;

    @Column(name = "toss_payment_key")
    private String tossPaymentKey;

    @Column(name = "coupon_id")
    private Long couponId;

    @Column(name = "discount_amount")
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "points_used", nullable = false)
    @org.hibernate.annotations.ColumnDefault("0")
    private Integer pointsUsed = 0;

    @Column(name = "ship_name")
    private String shipName;

    @Column(name = "ship_phone")
    private String shipPhone;

    @Column(name = "ship_postcode")
    private String shipPostcode;

    @Column(name = "ship_address")
    private String shipAddress;

    @Column(name = "ship_address_detail")
    private String shipAddressDetail;

    @Column(name = "share_token")
    private String shareToken;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getWebhookUrl() { return webhookUrl; }
    public void setWebhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; }

    public String getTossOrderId() { return tossOrderId; }
    public void setTossOrderId(String tossOrderId) { this.tossOrderId = tossOrderId; }

    public String getTossPaymentKey() { return tossPaymentKey; }
    public void setTossPaymentKey(String tossPaymentKey) { this.tossPaymentKey = tossPaymentKey; }

    public Long getCouponId() { return couponId; }
    public void setCouponId(Long couponId) { this.couponId = couponId; }

    public BigDecimal getDiscountAmount() { return discountAmount == null ? BigDecimal.ZERO : discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public Integer getPointsUsed() { return pointsUsed == null ? 0 : pointsUsed; }
    public void setPointsUsed(Integer pointsUsed) { this.pointsUsed = pointsUsed; }

    public String getShipName() { return shipName; }
    public void setShipName(String shipName) { this.shipName = shipName; }

    public String getShipPhone() { return shipPhone; }
    public void setShipPhone(String shipPhone) { this.shipPhone = shipPhone; }

    public String getShipPostcode() { return shipPostcode; }
    public void setShipPostcode(String shipPostcode) { this.shipPostcode = shipPostcode; }

    public String getShipAddress() { return shipAddress; }
    public void setShipAddress(String shipAddress) { this.shipAddress = shipAddress; }

    public String getShipAddressDetail() { return shipAddressDetail; }
    public void setShipAddressDetail(String shipAddressDetail) { this.shipAddressDetail = shipAddressDetail; }

    public String getShareToken() { return shareToken; }
    public void setShareToken(String shareToken) { this.shareToken = shareToken; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
