package com.vulnlab.shop.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "flags")
public class Flag {

    @Id
    @Column(name = "vuln_id")
    private String vulnId;

    @Column(name = "flag_value", nullable = false)
    private String flagValue;

    @Column(name = "captured_at")
    private LocalDateTime capturedAt;

    public String getVulnId() { return vulnId; }
    public void setVulnId(String vulnId) { this.vulnId = vulnId; }

    public String getFlagValue() { return flagValue; }
    public void setFlagValue(String flagValue) { this.flagValue = flagValue; }

    public LocalDateTime getCapturedAt() { return capturedAt; }
    public void setCapturedAt(LocalDateTime capturedAt) { this.capturedAt = capturedAt; }
}
