package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.GiftCardProduct;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GiftCardProductRepository extends JpaRepository<GiftCardProduct, Long> {
    List<GiftCardProduct> findByActiveTrueOrderByAmountAsc();
}
