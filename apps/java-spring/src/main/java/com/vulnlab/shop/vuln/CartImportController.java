package com.vulnlab.shop.vuln;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.vulnlab.shop.entity.Cart;
import com.vulnlab.shop.entity.CartItem;
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

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/cart")
@Tag(name = "장바구니", description = "장바구니 공유 코드 내보내기/가져오기")
@SecurityRequirement(name = "sessionCookie")
public class CartImportController {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;

    public CartImportController(CartRepository cartRepository, CartItemRepository cartItemRepository,
                                ProductRepository productRepository) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
    }

    private ObjectMapper shareMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ObjectMapper.DefaultTyping.NON_FINAL);
        return mapper;
    }

    private User currentUser(HttpSession session) {
        return (User) session.getAttribute("user");
    }

    private Long cartIdFor(Long userId) {
        return cartRepository.findByUserId(userId)
                .map(Cart::getId)
                .orElseGet(() -> cartRepository.save(new Cart(userId)).getId());
    }

    @Operation(summary = "장바구니 공유 코드 생성", description = "현재 장바구니를 불투명 코드로 내보낸다.")
    @GetMapping("/share")
    public ResponseEntity<?> share(HttpSession session) throws Exception {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        Long cartId = cartIdFor(user.getId());
        List<Map<String, Object>> items = new ArrayList<>();
        for (CartItem ci : cartItemRepository.findByCartIdOrderById(cartId)) {
            Map<String, Object> m = new HashMap<>();
            m.put("productId", ci.getProductId());
            m.put("quantity", ci.getQuantity());
            m.put("optionValue", ci.getOptionValue());
            items.add(m);
        }
        String json = shareMapper().writeValueAsString(items);
        String code = Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
        return ResponseEntity.ok(Map.of("code", code));
    }

    @Operation(summary = "공유 코드로 장바구니 가져오기", description = "코드를 디코드해 항목을 내 장바구니에 담는다.")
    @PostMapping("/import")
    public ResponseEntity<?> importShared(@RequestBody Map<String, Object> body, HttpSession session) throws Exception {
        User user = currentUser(session);
        if (user == null) return unauthorized();
        String code = String.valueOf(body.get("code"));
        String json = new String(Base64.getDecoder().decode(code), StandardCharsets.UTF_8);
        List<?> items = shareMapper().readValue(json, List.class);

        Long cartId = cartIdFor(user.getId());
        int added = 0;
        for (Object raw : items) {
            if (!(raw instanceof Map<?, ?> m)) continue;
            Object pid = m.get("productId");
            if (pid == null) continue;
            Long productId;
            try {
                productId = Long.valueOf(String.valueOf(pid));
            } catch (NumberFormatException e) {
                continue;
            }
            if (productRepository.findById(productId).isEmpty()) continue;
            int quantity = m.get("quantity") == null ? 1
                    : Math.max(1, Integer.parseInt(String.valueOf(m.get("quantity"))));
            String optionValue = m.get("optionValue") == null ? null : String.valueOf(m.get("optionValue"));
            Long fpid = productId;
            String fopt = optionValue;
            CartItem existing = cartItemRepository.findByCartIdOrderById(cartId).stream()
                    .filter(ci -> ci.getProductId().equals(fpid) && Objects.equals(ci.getOptionValue(), fopt))
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
            added++;
        }
        return ResponseEntity.ok(Map.of("itemCount", added));
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
    }
}
