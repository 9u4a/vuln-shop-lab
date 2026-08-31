package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.ReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReturnRepository extends JpaRepository<ReturnRequest, Long> {
    List<ReturnRequest> findByUserIdOrderByIdDesc(Long userId);
    List<ReturnRequest> findAllByOrderByIdDesc();
}
