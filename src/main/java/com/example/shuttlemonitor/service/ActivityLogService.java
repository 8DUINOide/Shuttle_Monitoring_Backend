package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.ActivityLog;
import com.example.shuttlemonitor.Repository.ActivityLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ActivityLogService {
    @Autowired
    private ActivityLogRepository activityLogRepository;

    public ResponseEntity<ActivityLog> createActivityLog(String eventType, String description, Long userId, Long shuttleId) {
        ActivityLog log = new ActivityLog();
        log.setEventType(eventType);
        log.setDescription(description);
        log.setTimestamp(LocalDateTime.now());
        activityLogRepository.save(log);
        return new ResponseEntity<>(log, HttpStatus.CREATED);
    }
}