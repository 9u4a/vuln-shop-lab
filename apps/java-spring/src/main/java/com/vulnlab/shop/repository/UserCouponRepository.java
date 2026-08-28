package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.UserCoupon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserCouponRepository extends JpaRepository<UserCoupon, Long> {
    List<UserCoupon> findByUserIdOrderByIdDesc(Long userId);
}
