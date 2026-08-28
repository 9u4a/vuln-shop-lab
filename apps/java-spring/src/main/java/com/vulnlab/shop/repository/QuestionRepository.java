package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    Page<Question> findByTitleContainingIgnoreCase(String title, Pageable pageable);
}
