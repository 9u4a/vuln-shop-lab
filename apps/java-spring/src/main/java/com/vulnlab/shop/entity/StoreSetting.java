package com.vulnlab.shop.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "store_settings")
public class StoreSetting {

    @Id
    @Column(name = "setting_key")
    private String key;

    @Column(name = "setting_value", length = 2000)
    private String value;

    public StoreSetting() {}

    public StoreSetting(String key, String value) {
        this.key = key;
        this.value = value;
    }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
