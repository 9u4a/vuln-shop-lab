package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.GiftCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GiftCardRepository extends JpaRepository<GiftCard, Long> {
    Optional<GiftCard> findByCode(String code);
    List<GiftCard> findByOwnerIdOrderByIdDesc(Long ownerId);
}
