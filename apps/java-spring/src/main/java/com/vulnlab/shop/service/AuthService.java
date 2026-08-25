package com.vulnlab.shop.service;

import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.security.Roles;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public boolean usernameTaken(String username) {
        return userRepository.findByUsername(username).isPresent();
    }

    public User signup(String username, String rawPassword) {
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(userRepository.count() == 0 ? Roles.SYSTEM_ADMIN : Roles.USER);
        return userRepository.save(user);
    }

    public Optional<User> login(String username, String rawPassword) {
        return userRepository.findByUsername(username)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPasswordHash()));
    }
}
