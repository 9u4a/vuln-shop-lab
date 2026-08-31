package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.PointTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {
    List<PointTransaction> findByUserIdOrderByIdDesc(Long userId);
}
