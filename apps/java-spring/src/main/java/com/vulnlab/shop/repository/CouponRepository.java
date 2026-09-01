package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CouponRepository extends JpaRepository<Coupon, Long> {
    List<Coupon> findByActiveTrueOrderByIdDesc();
    List<Coupon> findByCode(String code);
}
