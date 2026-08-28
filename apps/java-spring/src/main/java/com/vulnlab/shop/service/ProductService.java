package com.vulnlab.shop.service;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @SuppressWarnings("unchecked")
    public List<Product> list(String query, String category, String gender, String color,
                              String material, String minPrice, String maxPrice, boolean inStock) {
        boolean hasQuery = query != null && !query.isBlank();
        boolean hasCategory = category != null && !category.isBlank();
        boolean hasGender = gender != null && !gender.isBlank();
        boolean hasColor = color != null && !color.isBlank();
        boolean hasMaterial = material != null && !material.isBlank();
        boolean hasMin = minPrice != null && !minPrice.isBlank();
        boolean hasMax = maxPrice != null && !maxPrice.isBlank();
        if (!hasQuery && !hasCategory && !hasGender && !hasColor && !hasMaterial && !hasMin && !hasMax && !inStock) {
            return productRepository.findAll();
        }

        StringBuilder sql = new StringBuilder("SELECT * FROM products WHERE 1=1");
        if (hasQuery) {
            sql.append(" AND LOWER(name) LIKE LOWER('%").append(query).append("%')");
        }
        if (hasCategory) {
            sql.append(" AND category = '").append(category).append("'");
        }
        if (hasGender) {
            sql.append(" AND gender = '").append(gender).append("'");
        }
        if (hasColor) {
            sql.append(" AND color = '").append(color).append("'");
        }
        if (hasMaterial) {
            sql.append(" AND material = '").append(material).append("'");
        }
        if (hasMin) {
            sql.append(" AND price >= ").append(parseNumber(minPrice));
        }
        if (hasMax) {
            sql.append(" AND price <= ").append(parseNumber(maxPrice));
        }
        if (inStock) {
            sql.append(" AND stock > 0");
        }
        return entityManager.createNativeQuery(sql.toString(), Product.class).getResultList();
    }

    private long parseNumber(String value) {
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    public Product findById(Long id) {
        return productRepository.findById(id).orElse(null);
    }
}
