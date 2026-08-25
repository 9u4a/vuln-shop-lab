package com.vulnlab.shop.config;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final ProductRepository productRepository;

    public DataSeeder(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void run(String... args) {
        if (productRepository.count() > 0) {
            return;
        }
        List<Product> seed = List.of(
                product("Mechanical Keyboard", "Hot-swappable mechanical keyboard.", "89.99", "/img/keyboard.png", "accessories"),
                product("Wireless Mouse", "Ergonomic wireless mouse.", "29.99", "/img/mouse.png", "accessories"),
                product("4K Monitor", "27-inch 4K IPS monitor.", "349.99", "/img/monitor.png", "displays"),
                product("USB-C Hub", "7-in-1 USB-C hub.", "24.99", "/img/hub.png", "accessories"),
                product("Desk Lamp", "LED desk lamp with USB charging.", "19.99", "/img/lamp.png", "office")
        );
        productRepository.saveAll(seed);
    }

    private Product product(String name, String description, String price, String imageUrl, String category) {
        Product p = new Product();
        p.setName(name);
        p.setDescription(description);
        p.setPrice(new BigDecimal(price));
        p.setImageUrl(imageUrl);
        p.setCategory(category);
        return p;
    }
}
