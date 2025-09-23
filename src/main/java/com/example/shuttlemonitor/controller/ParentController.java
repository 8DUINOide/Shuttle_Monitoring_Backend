package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Parent;
import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.ParentRepository;
import com.example.shuttlemonitor.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/parents")
public class ParentController {

    @Autowired
    private ParentRepository parentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createParent(@RequestBody Parent parent) {
        Map<String, String> response = new HashMap<>();

        if (parent.getUser() == null || parent.getFullName() == null) {
            response.put("error", "User and fullName are required");
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }

        Optional<User> existingUser = userRepository.findByUsernameOrEmail(
                parent.getUser().getUsername(), parent.getUser().getEmail());
        if (existingUser.isPresent()) {
            response.put("error", "Username or email already exists");
            return new ResponseEntity<>(response, HttpStatus.CONFLICT);
        }

        // Encode the password
        User user = parent.getUser();
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole("PARENT");
        userRepository.save(user);

        parent.setUser(user);
        parentRepository.save(parent);

        response.put("message", "Parent created successfully");
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getParent(@PathVariable Long userId) {
        Optional<Parent> parent = parentRepository.findById(userId);
        if (parent.isEmpty()) {
            return new ResponseEntity<>(Map.of("error", "Parent not found"), HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(parent.get(), HttpStatus.OK);
    }
}
