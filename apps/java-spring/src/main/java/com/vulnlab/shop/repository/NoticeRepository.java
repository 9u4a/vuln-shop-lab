package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.Notice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    Page<Notice> findByTitleContainingIgnoreCaseOrBodyContainingIgnoreCase(
            String title, String body, Pageable pageable);
}
