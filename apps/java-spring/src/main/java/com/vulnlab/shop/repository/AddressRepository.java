package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUserIdOrderByIsDefaultDescIdDesc(Long userId);
    List<Address> findByUserId(Long userId);
}
