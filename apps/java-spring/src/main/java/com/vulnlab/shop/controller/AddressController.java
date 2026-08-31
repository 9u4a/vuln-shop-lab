package com.vulnlab.shop.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/addresses")
@Tag(name = "주소 검색", description = "우편번호·주소 조회")
public class AddressController {

    private final List<Map<String, String>> addresses;

    public AddressController() {
        List<Map<String, String>> loaded = new ArrayList<>();
        try (InputStream in = new ClassPathResource("addresses.json").getInputStream()) {
            ObjectMapper mapper = new ObjectMapper();
            loaded = mapper.readValue(in, new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, String>>>() {});
        } catch (Exception e) {
            // 리소스 로드 실패 시 빈 목록으로 동작
        }
        this.addresses = loaded;
    }

    @GetMapping
    public Map<String, Object> search(@RequestParam(required = false) String q) {
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        if (needle.isEmpty()) {
            return Map.of("addresses", List.of(), "total", 0);
        }
        List<Map<String, String>> matched = new ArrayList<>();
        for (Map<String, String> a : addresses) {
            String address = a.getOrDefault("address", "").toLowerCase(Locale.ROOT);
            String zonecode = a.getOrDefault("zonecode", "");
            if (address.contains(needle) || zonecode.contains(needle)) {
                matched.add(a);
            }
        }
        List<Map<String, String>> page = matched.size() > 30 ? matched.subList(0, 30) : matched;
        return Map.of("addresses", page, "total", matched.size());
    }
}
