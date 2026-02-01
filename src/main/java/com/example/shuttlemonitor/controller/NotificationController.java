package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Notification;
import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.UserRepository;
import com.example.shuttlemonitor.service.NotificationService;
import com.example.shuttlemonitor.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<List<Notification>> getUserNotifications() {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();

        return ResponseEntity.ok(notificationService.getUserNotifications(currentUser.getUserId()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();

        long count = notificationService.getUnreadCount(currentUser.getUserId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        // In a real app, verify the notification belongs to the user
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead() {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();

        notificationService.markAllAsRead(currentUser.getUserId());
        return ResponseEntity.ok().build();
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByUsername(auth.getName());
    }
}
