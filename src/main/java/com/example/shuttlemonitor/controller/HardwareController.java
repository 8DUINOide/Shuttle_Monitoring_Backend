package com.example.shuttlemonitor.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/hardware")
@CrossOrigin(origins = "*")
public class HardwareController {

    // Simple in-memory buffer: type -> value
    private static final Map<String, String> latestScans = new ConcurrentHashMap<>();

    @PostMapping("/scan")
    public ResponseEntity<?> receiveScan(@RequestBody Map<String, String> payload) {
        // payload: { "type": "rfid" || "fingerprint", "value": "..." }
        String type = payload.get("type");
        String value = payload.get("value");
        
        if (type != null && value != null) {
            latestScans.put(type.toLowerCase(), value); // Normalize keys
            return ResponseEntity.ok(Map.of("message", "Scan received", "type", type, "value", value));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "Invalid payload: 'type' and 'value' required"));
    }

    @GetMapping("/latest")
    public ResponseEntity<Map<String, String>> getLatestScan() {
        // Return currently buffered scans and clear them to prevent double-processing
        Map<String, String> response = new ConcurrentHashMap<>(latestScans);
        latestScans.clear(); 
        return ResponseEntity.ok(response);
    }
}
