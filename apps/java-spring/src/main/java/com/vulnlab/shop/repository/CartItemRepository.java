package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    List<CartItem> findByCartIdOrderById(Long cartId);

    @Transactional
    void deleteByCartId(Long cartId);
}
