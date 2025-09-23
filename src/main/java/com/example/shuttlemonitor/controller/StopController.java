package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Stop;
import com.example.shuttlemonitor.service.StopService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/stops")
public class StopController {

    @Autowired
    private StopService stopService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createStop(@RequestBody Stop stop) {
        Map<String, String> response = new HashMap<>();
        ResponseEntity<Stop> result = stopService.createStop(stop);
        if (result.getStatusCode() == HttpStatus.CREATED) {
            response.put("message", "Stop created successfully");
        } else {
            response.put("error", "Failed to create stop");
        }
        return new ResponseEntity<>(response, result.getStatusCode());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Stop> getStop(@PathVariable Long id) {
        return stopService.getStop(id);
    }
}