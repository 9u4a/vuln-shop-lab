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
    public List<Product> list(String query, String category) {
        boolean hasQuery = query != null && !query.isBlank();
        boolean hasCategory = category != null && !category.isBlank();
        if (!hasQuery && !hasCategory) {
            return productRepository.findAll();
        }

        StringBuilder sql = new StringBuilder("SELECT * FROM products WHERE 1=1");
        if (hasQuery) {
            sql.append(" AND LOWER(name) LIKE LOWER('%").append(query).append("%')");
        }
        if (hasCategory) {
            sql.append(" AND category = '").append(category).append("'");
        }
        return entityManager.createNativeQuery(sql.toString(), Product.class).getResultList();
    }

    public Product findById(Long id) {
        return productRepository.findById(id).orElse(null);
    }
}
