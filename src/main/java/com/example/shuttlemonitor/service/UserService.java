package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public ResponseEntity<String> createUser(User user) {
        try {
            Optional<User> existingUser = userRepository.findByUsernameOrEmail(user.getUsername(), user.getEmail());
            if (existingUser.isPresent()) {
                return new ResponseEntity<>("Username or email already exists", HttpStatus.CONFLICT);
            }
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            if (user.getRole() == null) {
                user.setRole("USER"); // Default role if none provided
            }
            userRepository.save(user);
            return new ResponseEntity<>("User created successfully", HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>("Failed to create user: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public List<User> getAllUsers(String sortBy, String sortOrder) {
        String sortField = switch (sortBy.toLowerCase()) {
            case "username" -> "username";
            case "email" -> "email";
            case "createdat" -> "createdAt";
            default -> "userId";
        };
        Sort sort = Sort.by(sortOrder.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sortField);
        return userRepository.findAll(sort);
    }

    public ResponseEntity<User> getUserWithDetails(Long userId) {
        return userRepository.findByIdWithDetails(userId)
                .map(user -> new ResponseEntity<>(user, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }
}
