package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.RecentlyViewed;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecentlyViewedRepository extends JpaRepository<RecentlyViewed, Long> {
    List<RecentlyViewed> findByUserIdOrderByIdDesc(Long userId);
    Optional<RecentlyViewed> findByUserIdAndProductId(Long userId, Long productId);
}
