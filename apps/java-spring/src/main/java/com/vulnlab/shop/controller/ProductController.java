package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.Review;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.ProductLikeRepository;
import com.vulnlab.shop.repository.ReviewRepository;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.service.ProductService;
import jakarta.servlet.http.HttpSession;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ProductLikeRepository likeRepository;

    public ProductController(ProductService productService, ReviewRepository reviewRepository,
                              UserRepository userRepository, ProductLikeRepository likeRepository) {
        this.productService = productService;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.likeRepository = likeRepository;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String q,
                                     @RequestParam(required = false) String category,
                                     @RequestParam(required = false) String sort,
                                     @RequestParam(required = false) String gender,
                                     @RequestParam(required = false) String color,
                                     @RequestParam(required = false) String material,
                                     @RequestParam(required = false) String minPrice,
                                     @RequestParam(required = false) String maxPrice,
                                     @RequestParam(required = false) String inStock,
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
        return ResponseEntity.ok(Map.of("product", product));
    }

    @GetMapping("/{id}/reviews")
    public Map<String, Object> listReviews(@PathVariable Long id) {
        List<Review> reviews = reviewRepository.findByProductId(id);
        List<Map<String, Object>> body = reviews.stream()
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .map(r -> Map.<String, Object>of(
                        "id", r.getId(),
                        "username", usernameOf(r.getUserId()),
                        "rating", r.getRating(),
                        "body", r.getBody(),
                        "createdAt", r.getCreatedAt()))
                .toList();
        return Map.of("reviews", body);
    }

    @PostMapping("/{id}/reviews")
    public ResponseEntity<?> createReview(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        Product product = productService.findById(id);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }

        int rating = Integer.parseInt(String.valueOf(body.getOrDefault("rating", 0)));
        String text = String.valueOf(body.getOrDefault("body", "")).trim();
        if (rating < 1 || rating > 5 || text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "평점(1~5)과 내용을 입력해주세요."));
        }

        Review review = new Review();
        review.setProductId(product.getId());
        review.setUserId(user.getId());
        review.setRating(rating);
        review.setBody(text);
        reviewRepository.save(review);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "review", Map.of(
                        "id", review.getId(),
                        "username", user.getUsername(),
                        "rating", rating,
                        "body", text)));
    }

    @PutMapping("/{id}/reviews/{reviewId}")
    public ResponseEntity<?> updateReview(@PathVariable Long id, @PathVariable Long reviewId,
                                           @RequestBody Map<String, Object> body, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null || !review.getProductId().equals(id)) {
            return ResponseEntity.notFound().build();
        }

        int rating = Integer.parseInt(String.valueOf(body.getOrDefault("rating", 0)));
        String text = String.valueOf(body.getOrDefault("body", "")).trim();
        if (rating < 1 || rating > 5 || text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "평점(1~5)과 내용을 입력해주세요."));
        }

        review.setRating(rating);
        review.setBody(text);
        reviewRepository.save(review);

        return ResponseEntity.ok(Map.of("review", Map.of(
                "id", review.getId(), "rating", rating, "body", text)));
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
