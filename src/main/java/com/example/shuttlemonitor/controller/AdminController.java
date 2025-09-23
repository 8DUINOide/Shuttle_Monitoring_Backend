package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Admin;
import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.service.AdminService;
import com.example.shuttlemonitor.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserService userService;

    @Autowired
    private AdminService adminService;

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createUser(@RequestBody User user) {
        Map<String, String> response = new HashMap<>();
        if (user.getRole() == null) {
            user.setRole("USER"); // Ensure role is set
        }
        ResponseEntity<String> result = userService.createUser(user);
        if (result.getStatusCode() == HttpStatus.CREATED) {
            response.put("message", result.getBody());
        } else {
            response.put("error", result.getBody());
        }
        return new ResponseEntity<>(response, result.getStatusCode());
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers(
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {
        List<User> users = userService.getAllUsers(sortBy, sortOrder);
        return ResponseEntity.ok(users);
    }

    @PostMapping("/admins")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createAdmin(@RequestBody Admin admin) {
        Map<String, String> response = new HashMap<>();
        if (admin.getUser() != null && admin.getUser().getRole() == null) {
            admin.getUser().setRole("ADMIN"); // Ensure admin user has ADMIN role
        }
        ResponseEntity<Admin> result = adminService.createAdmin(admin);
        if (result.getStatusCode() == HttpStatus.CREATED) {
            response.put("message", "Admin created successfully");
        } else {
            response.put("error", "Failed to create admin");
        }
        return new ResponseEntity<>(response, result.getStatusCode());
    }

    @GetMapping("/admins/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Admin> getAdmin(@PathVariable Long userId) {
        return adminService.getAdmin(userId);
    }
}
