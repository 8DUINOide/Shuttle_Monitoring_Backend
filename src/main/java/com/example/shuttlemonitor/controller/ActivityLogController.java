package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.ActivityLog;
import com.example.shuttlemonitor.service.ActivityLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/activity-logs")
public class ActivityLogController {

    @Autowired
    private ActivityLogService activityLogService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createActivityLog(
            @RequestBody Map<String, Object> request) {
        Map<String, String> response = new HashMap<>();
        try {
            String eventType = (String) request.get("eventType");
            String description = (String) request.get("description");
            Long userId = request.get("userId") != null ? Long.parseLong(request.get("userId").toString()) : null;
            Long shuttleId = request.get("shuttleId") != null ? Long.parseLong(request.get("shuttleId").toString()) : null;

            ResponseEntity<ActivityLog> result = activityLogService.createActivityLog(eventType, description, userId, shuttleId);
            if (result.getStatusCode() == HttpStatus.CREATED) {
                response.put("message", "Activity log created successfully");
            } else {
                response.put("error", "Failed to create activity log");
            }
            return new ResponseEntity<>(response, result.getStatusCode());
        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }
    }
}