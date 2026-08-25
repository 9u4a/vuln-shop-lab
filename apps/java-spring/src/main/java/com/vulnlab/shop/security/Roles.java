package com.vulnlab.shop.security;

public final class Roles {

    public static final String USER = "user";
    public static final String ADMIN = "admin";
    public static final String SYSTEM_ADMIN = "system_admin";

    private Roles() {}

    public static boolean isAdminOrAbove(String role) {
        return ADMIN.equals(role) || SYSTEM_ADMIN.equals(role);
    }

    public static boolean isSystemAdmin(String role) {
        return SYSTEM_ADMIN.equals(role);
    }
}
