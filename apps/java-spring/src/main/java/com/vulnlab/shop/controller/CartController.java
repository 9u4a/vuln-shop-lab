package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Cart;
import com.vulnlab.shop.entity.CartItem;
import com.vulnlab.shop.entity.Product;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.CartItemRepository;
import com.vulnlab.shop.repository.CartRepository;
import com.vulnlab.shop.repository.ProductRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/cart")
@Tag(name = "장바구니", description = "서버 장바구니 (로그인 필요)")
@SecurityRequirement(name = "sessionCookie")
public class CartController {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;

    public CartController(CartRepository cartRepository, CartItemRepository cartItemRepository,
                          ProductRepository productRepository) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
    }

    private User currentUser(HttpSession session) {
        return (User) session.getAttribute("user");
    }

    private Long cartIdFor(Long userId) {
        return cartRepository.findByUserId(userId)
                .map(Cart::getId)
                .orElseGet(() -> cartRepository.save(new Cart(userId)).getId());
    }

    private List<Map<String, Object>> lines(Long cartId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (CartItem ci : cartItemRepository.findByCartIdOrderById(cartId)) {
            Product p = productRepository.findById(ci.getProductId()).orElse(null);
            if (p == null) continue;
            Map<String, Object> m = new HashMap<>();
            m.put("id", ci.getId());
            m.put("productId", ci.getProductId());
            m.put("name", p.getName());
            m.put("price", p.getPrice());
            m.put("quantity", ci.getQuantity());
            m.put("optionValue", ci.getOptionValue());
            m.put("stock", p.getStock());
            m.put("optionName", p.getOptionName());
            m.put("optionValues", p.getOptionValuesList());
            out.add(m);
        }
        return out;
    }

    @Operation(summary = "내 장바구니")
    @GetMapping
    public ResponseEntity<?> get(HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        return ResponseEntity.ok(Map.of("items", lines(cartIdFor(user.getId()))));
    }

    @Operation(summary = "장바구니 담기")
    @PostMapping("/items")
    public ResponseEntity<?> add(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Long productId = Long.valueOf(String.valueOf(body.get("productId")));
        int quantity = Math.max(1, body.get("quantity") == null ? 1 : Integer.parseInt(String.valueOf(body.get("quantity"))));
        String optionValue = body.get("optionValue") == null ? null : String.valueOf(body.get("optionValue"));
        if (productRepository.findById(productId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "상품을 찾을 수 없습니다."));
        }
        Long cartId = cartIdFor(user.getId());
        CartItem existing = cartItemRepository.findByCartIdOrderById(cartId).stream()
                .filter(ci -> ci.getProductId().equals(productId) && Objects.equals(ci.getOptionValue(), optionValue))
                .findFirst().orElse(null);
        if (existing != null) {
            existing.setQuantity(existing.getQuantity() + quantity);
            cartItemRepository.save(existing);
        } else {
            CartItem ci = new CartItem();
            ci.setCartId(cartId);
            ci.setProductId(productId);
            ci.setQuantity(quantity);
            ci.setOptionValue(optionValue);
            cartItemRepository.save(ci);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("items", lines(cartId)));
    }

    @Operation(summary = "장바구니 수량 변경 (0 이하면 삭제)")
    @PutMapping("/items/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Long cartId = cartIdFor(user.getId());
        CartItem ci = cartItemRepository.findById(id).filter(x -> x.getCartId().equals(cartId)).orElse(null);
        if (ci == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "장바구니 항목을 찾을 수 없습니다."));
        int quantity = body.get("quantity") == null ? 0 : Integer.parseInt(String.valueOf(body.get("quantity")));
        if (quantity <= 0) {
            cartItemRepository.delete(ci);
        } else {
            ci.setQuantity(quantity);
            cartItemRepository.save(ci);
        }
        return ResponseEntity.ok(Map.of("items", lines(cartId)));
    }

    @Operation(summary = "장바구니 항목 삭제")
    @DeleteMapping("/items/{id}")
    public ResponseEntity<?> remove(@PathVariable Long id, HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Long cartId = cartIdFor(user.getId());
        cartItemRepository.findById(id).filter(x -> x.getCartId().equals(cartId)).ifPresent(cartItemRepository::delete);
        return ResponseEntity.ok(Map.of("items", lines(cartId)));
    }

    @Operation(summary = "장바구니 비우기")
    @DeleteMapping
    public ResponseEntity<?> clear(HttpSession session) {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        cartItemRepository.deleteByCartId(cartIdFor(user.getId()));
        return ResponseEntity.ok(Map.of("items", List.of()));
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
    }
}
