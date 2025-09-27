package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Parent;
import com.example.shuttlemonitor.Repository.ParentRepository;
import com.example.shuttlemonitor.Repository.UserRepository;
import com.example.shuttlemonitor.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/parents")
public class ParentController {

    @Autowired
    private ParentRepository parentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<Parent> getParent(@PathVariable Long id) {
        Parent parent = parentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Parent not found"));
        userService.checkAccessForParent(parent);
        return ResponseEntity.ok(parent);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@userService.isOwnerOrAdminForParent(#id)")
    public ResponseEntity<Parent> updateParent(@PathVariable Long id, @RequestBody Parent updatedParent) {
        Parent parent = parentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Parent not found"));
        // Update fields
        parent.setCurrentAddress(updatedParent.getCurrentAddress());
        parent.setFullName(updatedParent.getFullName());
        parent.setContactPhone(updatedParent.getContactPhone());
        // etc.
        parentRepository.save(parent);
        return ResponseEntity.ok(parent);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteParent(@PathVariable Long id) {
        Parent parent = parentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Parent not found"));
        userRepository.delete(parent.getUser());
        parentRepository.delete(parent);
        return ResponseEntity.ok(Map.of("message", "Parent deleted successfully"));
    }
}