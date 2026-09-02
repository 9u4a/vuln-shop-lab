package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    Page<Question> findByTitleContainingIgnoreCase(String title, Pageable pageable);
    List<Question> findByUserIdOrderByIdDesc(Long userId);
}
