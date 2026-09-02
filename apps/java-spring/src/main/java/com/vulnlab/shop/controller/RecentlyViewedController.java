package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.RecentlyViewed;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.RecentlyViewedRepository;
import com.vulnlab.shop.service.ProductService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recently-viewed")
@Tag(name = "최근 본 상품", description = "최근 조회한 상품 목록 (로그인 필요)")
public class RecentlyViewedController {

    private final RecentlyViewedRepository recentlyViewedRepository;
    private final ProductService productService;

    public RecentlyViewedController(RecentlyViewedRepository recentlyViewedRepository, ProductService productService) {
        this.recentlyViewedRepository = recentlyViewedRepository;
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<?> mine(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        List<Product> products = new ArrayList<>();
        for (RecentlyViewed rv : recentlyViewedRepository.findByUserIdOrderByIdDesc(user.getId())) {
            Product p = productService.findById(rv.getProductId());
            if (p != null) products.add(p);
            if (products.size() >= 20) break;
        }
        return ResponseEntity.ok(Map.of("products", products));
    }
}
