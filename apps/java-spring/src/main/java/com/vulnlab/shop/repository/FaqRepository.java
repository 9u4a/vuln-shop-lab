package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.Faq;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaqRepository extends JpaRepository<Faq, Long> {
}
