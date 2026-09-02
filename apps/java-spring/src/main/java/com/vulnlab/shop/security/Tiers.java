package com.vulnlab.shop.security;

import java.util.List;

public final class Tiers {

    public static final String BASIC = "basic";
    public static final String SILVER = "silver";
    public static final String GOLD = "gold";
    public static final String VIP = "vip";

    public static final List<String> ALL = List.of(BASIC, SILVER, GOLD, VIP);

    private Tiers() {}

    public static boolean isValid(String tier) {
        return ALL.contains(tier);
    }

    public static double rate(String tier) {
        if (tier == null) return 0;
        switch (tier) {
            case SILVER: return 0.03;
            case GOLD: return 0.05;
            case VIP: return 0.1;
            default: return 0;
        }
    }
}
