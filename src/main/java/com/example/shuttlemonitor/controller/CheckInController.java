package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.CheckIn;
import com.example.shuttlemonitor.service.CheckInService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/checkins")
public class CheckInController {

    @Autowired
    private CheckInService checkInService;

    @PostMapping
    public ResponseEntity<Map<String, String>> createCheckIn(
            @RequestBody Map<String, Object> request) {
        Map<String, String> response = new HashMap<>();
        try {
            String rfidTag = (String) request.get("rfidTag");
            Long shuttleId = Long.parseLong(request.get("shuttleId").toString());
            String checkType = (String) request.get("checkType");
            Double locationLat = request.get("locationLat") != null ? Double.parseDouble(request.get("locationLat").toString()) : null;
            Double locationLng = request.get("locationLng") != null ? Double.parseDouble(request.get("locationLng").toString()) : null;

            ResponseEntity<CheckIn> result = checkInService.createCheckIn(rfidTag, shuttleId, checkType, locationLat, locationLng);
            if (result.getStatusCode() == HttpStatus.CREATED) {
                response.put("message", "Check-in recorded successfully");
            } else {
                response.put("error", "Failed to record check-in");
            }
            return new ResponseEntity<>(response, result.getStatusCode());
        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }
    }
}