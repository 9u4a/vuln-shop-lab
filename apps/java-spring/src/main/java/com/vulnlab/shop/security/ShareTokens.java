package com.vulnlab.shop.security;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public final class ShareTokens {

    private ShareTokens() {}

    public static String of(Long orderId) {
        String encoded = URLEncoder.encode("oid=" + orderId, StandardCharsets.UTF_8);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(encoded.getBytes(StandardCharsets.UTF_8));
    }
}
