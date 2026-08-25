package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.Faq;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaqRepository extends JpaRepository<Faq, Long> {
    Page<Faq> findByQuestionContainingIgnoreCaseOrAnswerContainingIgnoreCase(
            String question, String answer, Pageable pageable);
}
