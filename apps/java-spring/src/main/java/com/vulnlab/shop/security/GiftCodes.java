package com.vulnlab.shop.security;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

public final class GiftCodes {

    private static final byte XOR_KEY = 0x2a;

    private GiftCodes() {}

    public static String of(long id, long amount) {
        byte[] p = ("gc1|" + id + "|" + amount).getBytes(StandardCharsets.UTF_8);
        for (int i = 0; i < p.length; i++) {
            p[i] ^= XOR_KEY;
        }
        return "GC-" + Base64.getUrlEncoder().withoutPadding().encodeToString(p);
    }
}
