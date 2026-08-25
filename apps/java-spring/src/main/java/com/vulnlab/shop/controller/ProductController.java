package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.Review;
import com.vulnlab.shop.entity.User;
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

    public ProductController(ProductService productService, ReviewRepository reviewRepository,
                              UserRepository userRepository) {
        this.productService = productService;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String q,
                                     @RequestParam(required = false) String category,
                                     @RequestParam(required = false) String sort) {
        List<Product> products = productService.list(q, category);

        Map<String, Object> body = new LinkedHashMap<>();
        if (sort == null || sort.isBlank()) {
            body.put("products", products);
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
    public ResponseEntity<?> detail(@PathVariable Long id) {
        Product product = productService.findById(id);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
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
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        Product product = productService.findById(id);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }

        int rating = Integer.parseInt(String.valueOf(body.getOrDefault("rating", 0)));
        String text = String.valueOf(body.getOrDefault("body", "")).trim();
        if (rating < 1 || rating > 5 || text.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rating (1-5) and non-empty body are required."));
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

    private String usernameOf(Long userId) {
        return userRepository.findById(userId).map(User::getUsername).orElse("unknown");
    }
}
