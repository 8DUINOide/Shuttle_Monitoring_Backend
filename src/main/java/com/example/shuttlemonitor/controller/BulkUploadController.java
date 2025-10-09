package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.service.BulkUploadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/bulk-upload")
public class BulkUploadController {

    @Autowired
    private BulkUploadService bulkUploadService;

    @PostMapping("/parents-students")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadBulkParentsStudents(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is required"));
        }
        if (!file.getContentType().startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") &&
                !file.getContentType().startsWith("application/vnd.ms-excel")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only Excel files are allowed"));
        }

        try {
            Map<String, Object> result = bulkUploadService.processBulkParentsStudents(file);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to process file: " + e.getMessage()));
        }
    }

    @PostMapping("/operators-drivers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadBulkOperatorsDrivers(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is required"));
        }
        if (!file.getContentType().startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") &&
                !file.getContentType().startsWith("application/vnd.ms-excel")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only Excel files are allowed"));
        }

        try {
            Map<String, Object> result = bulkUploadService.processBulkOperatorsDrivers(file);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to process file: " + e.getMessage()));
        }
    }
}