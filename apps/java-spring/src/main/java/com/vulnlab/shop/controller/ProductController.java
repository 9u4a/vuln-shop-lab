package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.RecentlyViewed;
import com.vulnlab.shop.entity.Review;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.ProductLikeRepository;
import com.vulnlab.shop.repository.RecentlyViewedRepository;
import com.vulnlab.shop.repository.ReviewRepository;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.service.ProductService;
import com.vulnlab.shop.storage.Uploads;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@Tag(name = "상품", description = "상품 목록·검색·상세 및 후기")
public class ProductController {

    private final ProductService productService;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ProductLikeRepository likeRepository;
    private final RecentlyViewedRepository recentlyViewedRepository;

    public ProductController(ProductService productService, ReviewRepository reviewRepository,
                              UserRepository userRepository, ProductLikeRepository likeRepository,
                              RecentlyViewedRepository recentlyViewedRepository) {
        this.productService = productService;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
        this.recentlyViewedRepository = recentlyViewedRepository;
    }

    @Operation(summary = "상품 목록·검색", description = "모든 파라미터 선택. 응답: { products: [...] } (sort 사용 시 sortKeys 동반 가능).")
    @GetMapping
    public Map<String, Object> list(@Parameter(description = "상품명 검색어") @RequestParam(required = false) String q,
                                     @Parameter(description = "카테고리 코드") @RequestParam(required = false) String category,
                                     @Parameter(description = "정렬 키 (reviews, likes, price 등)") @RequestParam(required = false) String sort,
                                     @Parameter(description = "성별 (men, women, unisex)") @RequestParam(required = false) String gender,
                                     @Parameter(description = "컬러") @RequestParam(required = false) String color,
                                     @Parameter(description = "소재") @RequestParam(required = false) String material,
                                     @Parameter(description = "최소 가격") @RequestParam(required = false) String minPrice,
                                     @Parameter(description = "최대 가격") @RequestParam(required = false) String maxPrice,
                                     @Parameter(description = "재고 있는 상품만 (1 또는 true)") @RequestParam(required = false) String inStock,
                                     HttpSession session) {
        boolean stockOnly = "1".equals(inStock) || "true".equalsIgnoreCase(inStock);
        List<Product> products = productService.list(q, category, gender, color, material, minPrice, maxPrice, stockOnly);
        User sessionUser = (User) session.getAttribute("user");
        for (Product p : products) {
            p.setReviewCount(reviewRepository.countByProductId(p.getId()));
            p.setLikeCount(likeRepository.countByProductId(p.getId()));
            p.setLiked(sessionUser != null && likeRepository.existsByUserIdAndProductId(sessionUser.getId(), p.getId()));
        }

        Map<String, Object> body = new LinkedHashMap<>();
        if (sort == null || sort.isBlank()) {
            body.put("products", products);
            return body;
        }

        // 후기순/좋아요순은 앱 레벨 정렬 — SpEL로 평가하지 않는다.
        if ("reviews".equals(sort)) {
            List<Product> sorted = new ArrayList<>(products);
            sorted.sort(Comparator.comparing((Product p) ->
                    p.getReviewCount() == null ? 0L : p.getReviewCount()).reversed());
            body.put("products", sorted);
            return body;
        }
        if ("likes".equals(sort)) {
            List<Product> sorted = new ArrayList<>(products);
            sorted.sort(Comparator.comparing((Product p) ->
                    p.getLikeCount() == null ? 0L : p.getLikeCount()).reversed());
            body.put("products", sorted);
            return body;
        }

        ExpressionParser parser = new SpelExpressionParser();
        Expression expression = parser.parseExpression(sort);
        List<String> sortKeys = new ArrayList<>();
        List<Product> sorted = new ArrayList<>(products);
        sorted.sort(Comparator.comparing(p -> evaluateSortKey(expression, p)));
        for (Product p : sorted) {
            sortKeys.add(evaluateSortKey(expression, p));
        }

        body.put("products", sorted);
        body.put("sortKeys", sortKeys);
        return body;
    }

    private String evaluateSortKey(Expression expression, Product product) {
        try {
            Object value = expression.getValue(new StandardEvaluationContext(product));
            return String.valueOf(value);
        } catch (Exception e) {
            return "ERROR: " + e.getMessage();
        }
    }

    @Operation(summary = "상품 상세")
    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id, HttpSession session) {
        Product product = productService.findById(id);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        product.setReviewCount(reviewRepository.countByProductId(product.getId()));
        product.setLikeCount(likeRepository.countByProductId(product.getId()));
        User sessionUser = (User) session.getAttribute("user");
        product.setLiked(sessionUser != null && likeRepository.existsByUserIdAndProductId(sessionUser.getId(), product.getId()));
        if (sessionUser != null) {
            recentlyViewedRepository.findByUserIdAndProductId(sessionUser.getId(), product.getId())
                    .ifPresent(recentlyViewedRepository::delete);
            recentlyViewedRepository.save(new RecentlyViewed(sessionUser.getId(), product.getId()));
            List<RecentlyViewed> all = recentlyViewedRepository.findByUserIdOrderByIdDesc(sessionUser.getId());
            if (all.size() > 20) {
                all.subList(20, all.size()).forEach(recentlyViewedRepository::delete);
            }
        }
        return ResponseEntity.ok(Map.of("product", product));
    }

    @Operation(summary = "상품 후기 목록")
    @GetMapping("/{id}/reviews")
    public Map<String, Object> listReviews(@PathVariable Long id) {
        List<Review> reviews = reviewRepository.findByProductId(id);
        List<Map<String, Object>> body = reviews.stream()
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.getId());
                    m.put("userId", r.getUserId());
                    m.put("username", usernameOf(r.getUserId()));
                    m.put("rating", r.getRating());
                    m.put("body", r.getBody());
                    m.put("imageUrl", r.getImageUrl());
                    m.put("secret", r.isSecret());
                    m.put("createdAt", r.getCreatedAt());
                    return m;
                })
                .toList();
        return Map.of("reviews", body);
    }

    @Operation(summary = "후기 작성 (로그인 필요, multipart/form-data)")
    @io.swagger.v3.oas.annotations.security.SecurityRequirement(name = "sessionCookie")
    @PostMapping("/{id}/reviews")
    public ResponseEntity<?> createReview(@PathVariable Long id,
                                           @RequestParam(value = "rating", required = false) Integer rating,
                                           @RequestParam(value = "body", required = false) String bodyRaw,
                                           @RequestParam(value = "secret", required = false) String secretRaw,
                                           @RequestParam(value = "image", required = false) MultipartFile image,
                                           HttpSession session) throws IOException {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        Product product = productService.findById(id);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }

        String text = bodyRaw == null ? "" : bodyRaw.trim();
        if (rating == null || rating < 1 || rating > 5 || text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "평점(1~5)과 내용을 입력해주세요."));
        }
        boolean secret = "true".equalsIgnoreCase(secretRaw) || "1".equals(secretRaw);
        String imageUrl = (image != null && Uploads.isAllowed(image)) ? Uploads.store(image) : null;

        Review review = new Review();
        review.setProductId(product.getId());
        review.setUserId(user.getId());
        review.setRating(rating);
        review.setBody(text);
        review.setImageUrl(imageUrl);
        review.setSecret(secret);
        reviewRepository.save(review);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("review", reviewPayload(review, user.getUsername())));
    }

    @PutMapping("/{id}/reviews/{reviewId}")
    public ResponseEntity<?> updateReview(@PathVariable Long id, @PathVariable Long reviewId,
                                           @RequestParam(value = "rating", required = false) Integer rating,
                                           @RequestParam(value = "body", required = false) String bodyRaw,
                                           @RequestParam(value = "secret", required = false) String secretRaw,
                                           @RequestParam(value = "image", required = false) MultipartFile image,
                                           HttpSession session) throws IOException {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null || !review.getProductId().equals(id)) {
            return ResponseEntity.notFound().build();
        }

        String text = bodyRaw == null ? "" : bodyRaw.trim();
        if (rating == null || rating < 1 || rating > 5 || text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "평점(1~5)과 내용을 입력해주세요."));
        }
        boolean secret = "true".equalsIgnoreCase(secretRaw) || "1".equals(secretRaw);
        String imageUrl = (image != null && Uploads.isAllowed(image)) ? Uploads.store(image) : review.getImageUrl();

        review.setRating(rating);
        review.setBody(text);
        review.setImageUrl(imageUrl);
        review.setSecret(secret);
        reviewRepository.save(review);

        return ResponseEntity.ok(Map.of("review", reviewPayload(review, usernameOf(review.getUserId()))));
    }

    private Map<String, Object> reviewPayload(Review review, String username) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", review.getId());
        m.put("userId", review.getUserId());
        m.put("username", username);
        m.put("rating", review.getRating());
        m.put("body", review.getBody());
        m.put("imageUrl", review.getImageUrl());
        m.put("secret", review.isSecret());
        return m;
    }

    @DeleteMapping("/{id}/reviews/{reviewId}")
    public ResponseEntity<?> deleteReview(@PathVariable Long id, @PathVariable Long reviewId, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null || !review.getProductId().equals(id)) {
            return ResponseEntity.notFound().build();
        }

        reviewRepository.delete(review);
        return ResponseEntity.noContent().build();
    }

    private String usernameOf(Long userId) {
        return userRepository.findById(userId).map(User::getUsername).orElse("unknown");
    }
}
