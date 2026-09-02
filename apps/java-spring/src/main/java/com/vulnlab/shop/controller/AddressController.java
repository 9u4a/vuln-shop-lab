package com.vulnlab.shop.controller;

import com.vulnlab.shop.entity.Address;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.AddressRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/shipping-addresses")
@Tag(name = "배송지", description = "배송지 주소록 CRUD (로그인 필요)")
public class AddressController {

    private final AddressRepository addressRepository;

    public AddressController(AddressRepository addressRepository) {
        this.addressRepository = addressRepository;
    }

    private User currentUser(HttpSession session) {
        return (User) session.getAttribute("user");
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        return ResponseEntity.ok(Map.of("addresses",
                addressRepository.findByUserIdOrderByIsDefaultDescIdDesc(user.getId())));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        String name = str(body.get("name"));
        String address = str(body.get("address"));
        if (name.isBlank() || address.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "수령인과 주소는 필수입니다."));
        }
        boolean isDefault = truthy(body.get("isDefault"));
        if (isDefault) clearDefault(user.getId());
        Address a = new Address();
        a.setUserId(user.getId());
        a.setLabel(nullable(body.get("label")));
        a.setName(name);
        a.setPhone(nullable(body.get("phone")));
        a.setPostcode(nullable(body.get("postcode")));
        a.setAddress(address);
        a.setAddressDetail(nullable(body.get("addressDetail")));
        a.setDefault(isDefault);
        addressRepository.save(a);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("address", a));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        Address a = addressRepository.findById(id).orElse(null);
        if (a == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "배송지를 찾을 수 없습니다."));
        if (truthy(body.get("isDefault"))) {
            clearDefault(a.getUserId());
            a.setDefault(true);
        } else if (body.containsKey("isDefault")) {
            a.setDefault(false);
        }
        if (body.containsKey("label")) a.setLabel(nullable(body.get("label")));
        if (body.containsKey("name")) a.setName(str(body.get("name")));
        if (body.containsKey("phone")) a.setPhone(nullable(body.get("phone")));
        if (body.containsKey("postcode")) a.setPostcode(nullable(body.get("postcode")));
        if (body.containsKey("address")) a.setAddress(str(body.get("address")));
        if (body.containsKey("addressDetail")) a.setAddressDetail(nullable(body.get("addressDetail")));
        addressRepository.save(a);
        return ResponseEntity.ok(Map.of("address", a));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인이 필요합니다."));
        }
        if (!addressRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "배송지를 찾을 수 없습니다."));
        }
        addressRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private void clearDefault(Long userId) {
        for (Address a : addressRepository.findByUserId(userId)) {
            if (a.isDefault()) {
                a.setDefault(false);
                addressRepository.save(a);
            }
        }
    }

    private String str(Object o) { return o == null ? "" : String.valueOf(o); }
    private String nullable(Object o) { return o == null || String.valueOf(o).isBlank() ? null : String.valueOf(o); }
    private boolean truthy(Object o) { return o != null && Boolean.parseBoolean(String.valueOf(o)); }
}
