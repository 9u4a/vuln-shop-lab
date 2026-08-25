package com.vulnlab.shop.config;

import com.vulnlab.shop.entity.Flag;
import com.vulnlab.shop.repository.FlagRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@Order(2)
public class FlagSeeder implements CommandLineRunner {

    private static final String FLAG_ENV_PREFIX = "FLAG_";

    private final FlagRepository flagRepository;

    public FlagSeeder(FlagRepository flagRepository) {
        this.flagRepository = flagRepository;
    }

    @Override
    public void run(String... args) {
        int count = 0;
        for (Map.Entry<String, String> entry : System.getenv().entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (!key.startsWith(FLAG_ENV_PREFIX) || value == null || value.isBlank()) {
                continue;
            }
            String vulnId = key.substring(FLAG_ENV_PREFIX.length());
            Flag flag = flagRepository.findById(vulnId).orElseGet(Flag::new);
            flag.setVulnId(vulnId);
            flag.setFlagValue(value);
            flagRepository.save(flag);
            count++;
        }
        System.out.println("Seeded " + count + " flag(s) from environment");
    }
}
