package com.vulnlab.shop.service;

import com.vulnlab.shop.entity.PointTransaction;
import com.vulnlab.shop.entity.User;
import com.vulnlab.shop.repository.PointTransactionRepository;
import com.vulnlab.shop.repository.UserRepository;
import com.vulnlab.shop.security.Roles;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository, PointTransactionRepository pointTransactionRepository) {
        this.userRepository = userRepository;
        this.pointTransactionRepository = pointTransactionRepository;
    }

    public boolean usernameTaken(String username) {
        return userRepository.findByUsername(username).isPresent();
    }

    public User signup(String username, String rawPassword, String name, String phone, String email,
                        String postcode, String address, String addressDetail, String referralCode) {
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(userRepository.count() == 0 ? Roles.SYSTEM_ADMIN : Roles.USER);
        user.setName(name);
        user.setPhone(phone);
        user.setEmail(email);
        user.setPostcode(postcode);
        user.setAddress(address);
        user.setAddressDetail(addressDetail);
        user.setReferralCode("REF" + username.toUpperCase());
        User saved = userRepository.save(user);

        if (referralCode != null && !referralCode.isBlank()) {
            userRepository.findByReferralCode(referralCode).ifPresent(referrer -> {
                saved.setReferredBy(referrer.getId());
                saved.setPoints(saved.getPoints() + 1000);
                userRepository.save(saved);
                referrer.setPoints(referrer.getPoints() + 1000);
                userRepository.save(referrer);
                pointTransactionRepository.save(new PointTransaction(referrer.getId(), 1000, "추천인 보상", null));
                pointTransactionRepository.save(new PointTransaction(saved.getId(), 1000, "추천 가입 보상", null));
            });
        }
        return saved;
    }

    public Optional<User> login(String username, String rawPassword) {
        return userRepository.findByUsername(username)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPasswordHash()));
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public boolean passwordMatches(User user, String rawPassword) {
        return passwordEncoder.matches(rawPassword, user.getPasswordHash());
    }

    public Optional<User> findByAccount(String account) {
        return userRepository.findByUsername(account)
                .or(() -> userRepository.findByEmail(account));
    }

    public String issueResetToken(User user) {
        String token = Base64.getEncoder().encodeToString(String.valueOf(user.getId()).getBytes(StandardCharsets.UTF_8));
        user.setResetToken(token);
        user.setResetTokenExpires(LocalDateTime.now().plusHours(1));
        userRepository.save(user);
        return token;
    }

    public Optional<User> findByResetToken(String token) {
        return userRepository.findByResetToken(token);
    }

    public void resetPassword(User user, String newPassword) {
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpires(null);
        userRepository.save(user);
    }
}
