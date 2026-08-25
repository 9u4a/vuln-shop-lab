package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByNameContainingIgnoreCase(String name);
    List<Product> findByCategory(String category);
    List<Product> findByNameContainingIgnoreCaseAndCategory(String name, String category);
}
