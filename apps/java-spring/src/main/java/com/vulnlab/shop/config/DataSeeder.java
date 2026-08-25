package com.vulnlab.shop.config;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.ProductRepository;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.security.Roles;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Path UPLOAD_DIR = Paths.get("uploads");

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public DataSeeder(ProductRepository productRepository, UserRepository userRepository) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) throws IOException {
        seedDefaultAdmin();
        if (productRepository.count() > 0) {
            return;
        }
        List<Product> seed = List.of(
                product("Mechanical Keyboard", "Hot-swappable mechanical keyboard.", "89.99",
                        seedImage("keyboard.png"), "accessories", "Vulnlab", "KEY-001", 42, "Switch", "Red,Blue,Brown"),
                product("Wireless Mouse", "Ergonomic wireless mouse.", "29.99",
                        seedImage("mouse.png"), "accessories", "Vulnlab", "MOU-002", 87, "Color", "Black,White"),
                product("4K Monitor", "27-inch 4K IPS monitor.", "349.99",
                        seedImage("monitor.png"), "displays", "Vulnlab", "MON-003", 15, "Stand", "Standard,Adjustable"),
                product("USB-C Hub", "7-in-1 USB-C hub.", "24.99",
                        seedImage("hub.png"), "accessories", "Vulnlab", "HUB-004", 130, "Color", "Space Gray,Silver"),
                product("Desk Lamp", "LED desk lamp with USB charging.", "19.99",
                        seedImage("lamp.png"), "office", "Vulnlab", "LMP-005", 60, "Color", "White,Black")
        );
        productRepository.saveAll(seed);
    }

    private void seedDefaultAdmin() {
        if (userRepository.findByUsername("9u4a").isPresent()) {
            return;
        }
        User admin = new User();
        admin.setUsername("9u4a");
        admin.setPasswordHash(passwordEncoder.encode("9u4a"));
        admin.setRole(Roles.SYSTEM_ADMIN);
        userRepository.save(admin);
    }

    private String seedImage(String filename) throws IOException {
        Files.createDirectories(UPLOAD_DIR);
        Path dest = UPLOAD_DIR.resolve(filename);
        if (!Files.exists(dest)) {
            try (var in = new ClassPathResource("seed-images/" + filename).getInputStream()) {
                Files.copy(in, dest);
            }
        }
        return filename;
    }

    private Product product(String name, String description, String price, String imageUrl, String category,
                             String brand, String sku, int stock, String optionName, String optionValues) {
        Product p = new Product();
        p.setName(name);
        p.setDescription(description);
        p.setPrice(new BigDecimal(price));
        p.setImageUrl(imageUrl);
        p.setCategory(category);
        p.setBrand(brand);
        p.setSku(sku);
        p.setStock(stock);
        p.setOptionName(optionName);
        p.setOptionValues(optionValues);
        return p;
    }
}
