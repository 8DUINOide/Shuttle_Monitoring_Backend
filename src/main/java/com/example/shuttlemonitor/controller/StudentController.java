package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private StudentService studentService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createStudent(@RequestBody Student student) {
        Map<String, String> response = new HashMap<>();
        ResponseEntity<Student> result = studentService.createStudent(student);
        if (result.getStatusCode() == HttpStatus.CREATED) {
            response.put("message", "Student created successfully");
        } else {
            response.put("error", "Failed to create student");
        }
        return new ResponseEntity<>(response, result.getStatusCode());
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Student> getStudent(@PathVariable Long userId) {
        return studentService.getStudent(userId);
    }

    @GetMapping("/rfid/{rfidTag}")
    public ResponseEntity<Student> getStudentByRfidTag(@PathVariable String rfidTag) {
        return studentService.getStudentByRfidTag(rfidTag);
    }
}