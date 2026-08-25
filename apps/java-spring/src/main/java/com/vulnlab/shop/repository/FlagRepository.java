package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.Flag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FlagRepository extends JpaRepository<Flag, String> {
}
