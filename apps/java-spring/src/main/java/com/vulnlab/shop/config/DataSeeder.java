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
                product("기계식 키보드", "핫스왑 지원 기계식 키보드.", "89000",
                        seedImage("keyboard.png"), "accessories", "Vulnlab", "KEY-001", 42, "스위치", "Red,Blue,Brown"),
                product("무선 마우스", "인체공학 무선 마우스.", "29000",
                        seedImage("mouse.png"), "accessories", "Vulnlab", "MOU-002", 87, "색상", "Black,White"),
                product("4K 모니터", "27인치 4K IPS 모니터.", "349000",
                        seedImage("monitor.png"), "displays", "Vulnlab", "MON-003", 15, "스탠드", "Standard,Adjustable"),
                product("USB-C 허브", "7-in-1 USB-C 허브.", "24000",
                        seedImage("hub.png"), "accessories", "Vulnlab", "HUB-004", 130, "색상", "Space Gray,Silver"),
                product("LED 스탠드", "USB 충전 지원 LED 스탠드.", "19000",
                        seedImage("lamp.png"), "office", "Vulnlab", "LMP-005", 60, "색상", "White,Black")
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
