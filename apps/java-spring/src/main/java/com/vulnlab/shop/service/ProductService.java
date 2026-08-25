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

    public List<Product> list(String query, String category) {
        boolean hasQuery = query != null && !query.isBlank();
        boolean hasCategory = category != null && !category.isBlank();
        if (hasQuery && hasCategory) {
            return productRepository.findByNameContainingIgnoreCaseAndCategory(query, category);
        }
        if (hasQuery) {
            return productRepository.findByNameContainingIgnoreCase(query);
        }
        if (hasCategory) {
            return productRepository.findByCategory(category);
        }
        return productRepository.findAll();
    }

    public Product findById(Long id) {
        return productRepository.findById(id).orElse(null);
    }
}
