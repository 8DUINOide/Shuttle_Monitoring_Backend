package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.Driver;
import com.example.shuttlemonitor.Entity.Notification;
import com.example.shuttlemonitor.Entity.Parent;
import com.example.shuttlemonitor.Entity.Role;
import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.NotificationRepository;
import com.example.shuttlemonitor.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Create a notification for a specific user.
     */
    @Transactional
    public Notification createNotification(User recipient, String message, String type) {
        if (recipient == null) return null;

        Notification notification = new Notification();
        notification.setUser(recipient);
        notification.setMessage(message);
        notification.setType(type);
        return notificationRepository.save(notification);
    }

    /**
     * Notify a specific Parent (e.g., when their child checks in).
     */
    @Transactional
    public void notifyParent(Parent parent, String message) {
        if (parent != null && parent.getUser() != null) {
            createNotification(parent.getUser(), message, "INFO");
        }
    }

    /**
     * Notify a specific Driver.
     */
    @Transactional
    public void notifyDriver(Driver driver, String message) {
        if (driver != null && driver.getUser() != null) {
            createNotification(driver.getUser(), message, "ALERT");
        }
    }

    /**
     * Notify all Admins (e.g., system alerts, shuttle breakdowns).
     */
    @Transactional
    public void notifyAdmins(String message) {
        List<User> admins = userRepository.findByRole(Role.ADMIN); // Ensure this method exists or use generic
        for (User admin : admins) {
            createNotification(admin, message, "WARNING");
        }
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUser_UserIdOrderByTimestampDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUser_UserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.setRead(true);
            notificationRepository.save(notification);
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUser_UserIdOrderByTimestampDesc(userId);
        for (Notification n : unread) {
            if (!n.isRead()) {
                n.setRead(true);
            }
        }
        notificationRepository.saveAll(unread);
    }
}
