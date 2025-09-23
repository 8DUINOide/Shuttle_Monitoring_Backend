package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Driver;
import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.DriverRepository;
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
@RequestMapping("/api/drivers")
public class DriverController {

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createDriver(@RequestBody Driver driver) {
        Map<String, String> response = new HashMap<>();

        // Validate input
        if (driver.getUser() == null || driver.getLicenseNumber() == null) {
            response.put("error", "User and license number are required");
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }

        // Check for existing username or email
        Optional<User> existingUser = userRepository.findByUsernameOrEmail(
                driver.getUser().getUsername(), driver.getUser().getEmail());
        if (existingUser.isPresent()) {
            response.put("error", "Username or email already exists");
            return new ResponseEntity<>(response, HttpStatus.CONFLICT);
        }

        // Encode password and set role
        User user = driver.getUser();
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole("DRIVER");
        userRepository.save(user);

        // Save driver
        driver.setUser(user);
        driverRepository.save(driver);

        response.put("message", "Driver created successfully");
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getDriver(@PathVariable Long userId) {
        Optional<Driver> driver = driverRepository.findById(userId);
        if (driver.isEmpty()) {
            return new ResponseEntity<>(Map.of("error", "Driver not found"), HttpStatus.NOT_FOUND);
        }
        return new ResponseEntity<>(driver.get(), HttpStatus.OK);
    }
}
