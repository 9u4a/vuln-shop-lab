package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.RestockSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RestockSubscriptionRepository extends JpaRepository<RestockSubscription, Long> {
    List<RestockSubscription> findByUserIdOrderByIdDesc(Long userId);
    List<RestockSubscription> findAllByOrderByIdDesc();
    java.util.Optional<RestockSubscription> findByProductIdAndUserId(Long productId, Long userId);
    List<RestockSubscription> findByProductId(Long productId);
}
