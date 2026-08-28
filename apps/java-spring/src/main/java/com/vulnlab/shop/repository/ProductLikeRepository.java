package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.ProductLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductLikeRepository extends JpaRepository<ProductLike, Long> {
    List<ProductLike> findByUserIdOrderByIdDesc(Long userId);
    Optional<ProductLike> findByUserIdAndProductId(Long userId, Long productId);
    long countByProductId(Long productId);
    boolean existsByUserIdAndProductId(Long userId, Long productId);
}
