package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    // Fetch notifications for a specific user, newest first
    List<Notification> findByUser_UserIdOrderByTimestampDesc(Long userId);
    
    // Count unread notifications
    long countByUser_UserIdAndIsReadFalse(Long userId);
}
