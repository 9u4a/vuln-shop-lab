package com.vulnlab.shop.service;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<Product> list(String query) {
        if (query == null || query.isBlank()) {
            return productRepository.findAll();
        }
        return productRepository.findByNameContainingIgnoreCase(query);
    }

    public Product findById(Long id) {
        return productRepository.findById(id).orElse(null);
    }
}
