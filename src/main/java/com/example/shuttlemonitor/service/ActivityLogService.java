package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.ActivityLog;
import com.example.shuttlemonitor.Repository.ActivityLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ActivityLogService {

    @Autowired
    private ActivityLogRepository activityLogRepository;

    public void log(String message, String type) {
        log(message, type, null);
    }

    public void log(String message, String type, Long userId) {
        ActivityLog activityLog = new ActivityLog();
        activityLog.setMessage(message);
        activityLog.setType(type);
        activityLog.setUserId(userId);
        activityLog.setTimestamp(LocalDateTime.now());
        activityLogRepository.save(activityLog);
    }

    public List<ActivityLog> getRecentActivities() {
        return activityLogRepository.findTop10ByOrderByTimestampDesc();
    }
}
