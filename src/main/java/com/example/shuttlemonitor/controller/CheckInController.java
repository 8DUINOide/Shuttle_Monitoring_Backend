package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.CheckIn;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.service.CheckInService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@SecurityRequirement(name = "bearerAuth") // For Swagger JWT
@RestController
@RequestMapping("/api/check-in")
public class CheckInController {

    @Autowired
    private CheckInService checkInService;

    @PostMapping("/register-device/{studentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> registerDevice(@PathVariable Long studentId,
                                                              @RequestBody Map<String, String> deviceData) {
        String rfidTag = deviceData.get("rfidTag");
        
        // Support both new (hash1, 2, 3) and legacy (fingerprintHash) formats
        String hash1 = deviceData.getOrDefault("fingerprintHash1", deviceData.get("fingerprintHash"));
        String hash2 = deviceData.get("fingerprintHash2");
        String hash3 = deviceData.get("fingerprintHash3");

        if (rfidTag == null || hash1 == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "RFID tag and at least one fingerprint hash required");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        checkInService.registerDevice(studentId, rfidTag, hash1, hash2, hash3);

        // Fetch updated student for detailed response
        Student student = checkInService.getStudentById(studentId); // Add this method to CheckInService if needed

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Device registered successfully");
        response.put("studentId", studentId);
        response.put("studentUsername", student.getUser().getUsername());
        response.put("rfidTag", rfidTag);
        response.put("fingerprintHash1", hash1);
        response.put("fingerprintHash2", hash2);
        response.put("fingerprintHash3", hash3);
        response.put("timestamp", java.time.LocalDateTime.now().toString());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/log")
    public ResponseEntity<Map<String, Object>> logCheckIn(@RequestBody Map<String, Object> request) {
        Long studentId = Long.parseLong(request.get("studentId").toString());
        Long shuttleId = Long.parseLong(request.get("shuttleId").toString());
        String rfidTag = (String) request.get("rfidTag");
        String fingerprintHash = (String) request.get("fingerprintHash");
        String type = (String) request.get("type"); // "in" or "out"

        CheckIn checkIn = checkInService.logCheckIn(studentId, shuttleId, rfidTag, fingerprintHash, type);

        Map<String, Object> response = new HashMap<>();
        response.put("message", checkIn.getStatus().equals("success") ? "Check-in successful" : "Check-in failed (invalid credentials)");
        response.put("checkInId", checkIn.getCheckInId());
        response.put("studentId", studentId);
        response.put("shuttleId", shuttleId);
        response.put("type", type);
        response.put("status", checkIn.getStatus());
        response.put("timestamp", checkIn.getTimestamp().toString());

        return ResponseEntity.ok(response);
    }


    @PostMapping("/secure-scan")
    public ResponseEntity<Map<String, Object>> secureScan(@RequestBody Map<String, Object> request) {
        String rfidTag = (String) request.get("rfid");
        String fingerprintHash = (String) request.get("fingerprint");
        Long shuttleId = Long.parseLong(request.get("shuttleId").toString());

        try {
            CheckIn checkIn = checkInService.processSecureCheckIn(rfidTag, fingerprintHash, shuttleId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Secure Check-" + checkIn.getType() + " successful");
            response.put("checkInId", checkIn.getCheckInId());
            response.put("studentName", checkIn.getStudent().getFullName()); // Fixed: getFullName() from Student
            response.put("shuttleName", checkIn.getShuttle().getName());
            response.put("type", checkIn.getType());
            response.put("status", checkIn.getStatus());
            response.put("timestamp", checkIn.getTimestamp().toString());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/all")
    public ResponseEntity<java.util.List<CheckIn>> getAllCheckIns() {
        return ResponseEntity.ok(checkInService.getAllCheckIns());
    }
}