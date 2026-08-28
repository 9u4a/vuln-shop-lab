package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.LoginLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoginLogRepository extends JpaRepository<LoginLog, Long> {
    List<LoginLog> findTop200ByOrderByIdDesc();
    List<LoginLog> findTop200ByUsernameOrderByIdDesc(String username);
    List<LoginLog> findTop200BySuccessOrderByIdDesc(boolean success);
    List<LoginLog> findTop200ByUsernameAndSuccessOrderByIdDesc(String username, boolean success);
}
