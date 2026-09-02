package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop50ByUserIdOrderByIdDesc(Long userId);
    List<Notification> findByUserIdAndReadAtIsNull(Long userId);
    long countByUserIdAndReadAtIsNull(Long userId);
}
