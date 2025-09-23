package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.Notification;
import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.NotificationRepository;
import com.example.shuttlemonitor.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {
    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    public ResponseEntity<Notification> createNotification(Long recipientId, String message) {
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + recipientId));

        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setMessage(message);
        notification.setTimestamp(LocalDateTime.now());
        notification.setStatus("UNREAD");
        notificationRepository.save(notification);

        return new ResponseEntity<>(notification, HttpStatus.CREATED);
    }

    public ResponseEntity<List<Notification>> getNotificationsForUser(Long userId) {
        List<Notification> notifications = notificationRepository.findByRecipientUserId(userId);
        return new ResponseEntity<>(notifications, HttpStatus.OK);
    }
}