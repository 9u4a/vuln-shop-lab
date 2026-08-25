package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.OrderRepository;
import com.vulnlab.shop.repository.ProductRepository;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.security.Roles;
import com.vulnlab.shop.storage.Uploads;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    public AdminController(UserRepository userRepository, ProductRepository productRepository,
                            OrderRepository orderRepository) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
    }

    private ResponseEntity<?> requireAdmin(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        if (!Roles.isAdminOrAbove(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required."));
        }
        return null;
    }

    private ResponseEntity<?> requireSystemAdmin(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required."));
        }
        if (!Roles.isSystemAdmin(user.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "System admin access required."));
        }
        return null;
    }

    @GetMapping("/users")
    public ResponseEntity<?> listUsers(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        return ResponseEntity.ok(Map.of("users", userRepository.findAll()));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestBody Map<String, String> body, HttpSession session) {
        ResponseEntity<?> denied = requireSystemAdmin(session);
        if (denied != null) return denied;
        String role = body.get("role");
        if (!Roles.USER.equals(role) && !Roles.ADMIN.equals(role) && !Roles.SYSTEM_ADMIN.equals(role)) {
            return ResponseEntity.badRequest().body(Map.of("error", "role must be \"user\", \"admin\", or \"system_admin\"."));
        }
        User target = userRepository.findById(id).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        target.setRole(role);
        userRepository.save(target);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/orders")
    public ResponseEntity<?> listOrders(HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        List<Map<String, Object>> orders = orderRepository.findAll().stream()
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .map(o -> Map.<String, Object>of(
                        "id", o.getId(),
                        "username", userRepository.findById(o.getUserId()).map(User::getUsername).orElse("unknown"),
                        "status", o.getStatus(),
                        "totalAmount", o.getTotalAmount(),
                        "createdAt", o.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(Map.of("orders", orders));
    }

    @PostMapping("/products")
    public ResponseEntity<?> createProduct(@RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        String name = (String) body.get("name");
        Object priceRaw = body.get("price");
        if (name == null || name.isBlank() || priceRaw == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "name and price are required."));
        }
        Product product = new Product();
        product.setName(name);
        product.setDescription((String) body.get("description"));
        product.setPrice(new BigDecimal(String.valueOf(priceRaw)));
        product.setImageUrl((String) body.get("imageUrl"));
        product.setCategory((String) body.get("category"));
        productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", product.getId()));
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();
        if (body.get("name") != null) product.setName((String) body.get("name"));
        if (body.get("description") != null) product.setDescription((String) body.get("description"));
        if (body.get("price") != null) product.setPrice(new BigDecimal(String.valueOf(body.get("price"))));
        if (body.get("imageUrl") != null) product.setImageUrl((String) body.get("imageUrl"));
        if (body.get("category") != null) product.setCategory((String) body.get("category"));
        productRepository.save(product);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/products/{id}/image")
    public ResponseEntity<?> uploadProductImage(@PathVariable Long id, @RequestParam("image") MultipartFile file,
                                                 HttpSession session) throws IOException {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();
        if (!Uploads.isAllowed(file)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or missing image file."));
        }
        String filename = Uploads.store(file);
        product.setImageUrl(filename);
        productRepository.save(product);
        return ResponseEntity.ok(Map.of("imageUrl", filename));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id, HttpSession session) {
        ResponseEntity<?> denied = requireAdmin(session);
        if (denied != null) return denied;
        if (!productRepository.existsById(id)) return ResponseEntity.notFound().build();
        productRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
