package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.ProductLike;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.ProductLikeRepository;
import com.vulnlab.shop.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/likes")
public class LikeController {

    private final ProductLikeRepository likeRepository;
    private final ProductRepository productRepository;

    public LikeController(ProductLikeRepository likeRepository, ProductRepository productRepository) {
        this.likeRepository = likeRepository;
        this.productRepository = productRepository;
    }

    // 위시리스트(찜한 상품 목록). userId 파라미터가 있으면 그 사용자의 목록을 반환한다.
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) Long userId, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        Long targetUserId = userId != null ? userId : user.getId();
        List<ProductLike> likes = likeRepository.findByUserIdOrderByIdDesc(targetUserId);
        List<Product> products = new ArrayList<>();
        for (ProductLike like : likes) {
            productRepository.findById(like.getProductId()).ifPresent(p -> {
                p.setLiked(true);
                p.setLikeCount(likeRepository.countByProductId(p.getId()));
                products.add(p);
            });
        }
        return ResponseEntity.ok(Map.of("products", products));
    }

    // 찜 토글 — 이미 찜했으면 해제, 아니면 추가.
    @PostMapping("/{productId}")
    public ResponseEntity<?> toggle(@PathVariable Long productId, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        if (productRepository.findById(productId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "상품을 찾을 수 없습니다."));
        }
        boolean liked;
        var existing = likeRepository.findByUserIdAndProductId(user.getId(), productId);
        if (existing.isPresent()) {
            likeRepository.delete(existing.get());
            liked = false;
        } else {
            likeRepository.save(new ProductLike(user.getId(), productId));
            liked = true;
        }
        return ResponseEntity.ok(Map.of("liked", liked, "likeCount", likeRepository.countByProductId(productId)));
    }

    // 찜 해제.
    @DeleteMapping("/{productId}")
    public ResponseEntity<?> remove(@PathVariable Long productId, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        likeRepository.findByUserIdAndProductId(user.getId(), productId)
                .ifPresent(likeRepository::delete);
        return ResponseEntity.ok(Map.of("liked", false, "likeCount", likeRepository.countByProductId(productId)));
    }
}
