package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Notification;
import com.example.shuttlemonitor.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createNotification(
            @RequestBody Map<String, Object> request) {
        Map<String, String> response = new HashMap<>();
        try {
            Long recipientId = Long.parseLong(request.get("recipientId").toString());
            String message = (String) request.get("message");
            ResponseEntity<Notification> result = notificationService.createNotification(recipientId, message);
            if (result.getStatusCode() == HttpStatus.CREATED) {
                response.put("message", "Notification created successfully");
            } else {
                response.put("error", "Failed to create notification");
            }
            return new ResponseEntity<>(response, result.getStatusCode());
        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getNotificationsForUser(@PathVariable Long userId) {
        return notificationService.getNotificationsForUser(userId);
    }
}