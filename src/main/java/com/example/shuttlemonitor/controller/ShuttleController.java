package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.service.ShuttleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shuttles")
public class ShuttleController {

    @Autowired
    private ShuttleService shuttleService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createShuttle(@RequestBody Shuttle shuttle) {
        Map<String, String> response = new HashMap<>();
        ResponseEntity<Shuttle> result = shuttleService.createShuttle(shuttle);
        if (result.getStatusCode() == HttpStatus.CREATED) {
            response.put("message", "Shuttle created successfully");
        } else {
            response.put("error", "Failed to create shuttle");
        }
        return new ResponseEntity<>(response, result.getStatusCode());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Shuttle> getShuttle(@PathVariable Long id) {
        return shuttleService.getShuttle(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> updateShuttle(@PathVariable Long id, @RequestBody Shuttle shuttle) {
        Map<String, String> response = new HashMap<>();
        ResponseEntity<Shuttle> result = shuttleService.updateShuttle(id, shuttle);
        if (result.getStatusCode() == HttpStatus.OK) {
            response.put("message", "Shuttle updated successfully");
        } else {
            response.put("error", "Failed to update shuttle");
        }
        return new ResponseEntity<>(response, result.getStatusCode());
    }

    @GetMapping
    public ResponseEntity<List<Shuttle>> getAllShuttles(
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortOrder) {
        List<Shuttle> shuttles = shuttleService.getAllShuttles(sortBy, sortOrder);
        return ResponseEntity.ok(shuttles);
    }
}