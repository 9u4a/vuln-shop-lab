package com.vulnlab.shop.repository;

import com.vulnlab.shop.entity.StoreSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreSettingRepository extends JpaRepository<StoreSetting, String> {
}
