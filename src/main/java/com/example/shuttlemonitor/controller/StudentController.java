package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Repository.StudentRepository;
import com.example.shuttlemonitor.Repository.UserRepository;
import com.example.shuttlemonitor.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<Student> getStudent(@PathVariable Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        userService.checkAccessForStudent(student);
        return ResponseEntity.ok(student);
    }

    @GetMapping("/rfid/{rfid}")
    public ResponseEntity<Student> getStudentByRfid(@PathVariable String rfid) {
        Student student = studentRepository.findByRfidTag(rfid)
                .orElseThrow(() -> new IllegalArgumentException("Student not found by RFID"));
        userService.checkAccessForStudent(student);
        return ResponseEntity.ok(student);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Student>> getAllStudents(
            @RequestParam(defaultValue = "studentId") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {
        Sort sort = Sort.by(sortOrder.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sortBy);
        List<Student> students = studentRepository.findAll(sort);
        return ResponseEntity.ok(students);
    }

    // New: Assign or update shuttle for student (admin-only)
    @PutMapping("/{studentId}/assigned-shuttle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> assignShuttle(@PathVariable Long studentId, @RequestBody Map<String, Long> request) {
        Long shuttleId = request.get("shuttleId");
        if (shuttleId == null) {
            Map<String, Object> errorResponse = Map.of("error", "Shuttle ID is required");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        Student updatedStudent = userService.assignShuttleToStudent(studentId, shuttleId);

        Map<String, Object> response = Map.of(
                "message", "Shuttle assigned successfully",
                "studentId", studentId,
                "assignedShuttleId", updatedStudent.getAssignedShuttle() != null ? updatedStudent.getAssignedShuttle().getShuttleId() : null,
                "route", updatedStudent.getAssignedShuttle() != null ? updatedStudent.getAssignedShuttle().getRoute() : null
        );
        return ResponseEntity.ok(response);
    }

    // New: Get assigned shuttle for student (admin, student, or parent)
    @GetMapping("/{studentId}/assigned-shuttle")
    public ResponseEntity<Map<String, Object>> getAssignedShuttle(@PathVariable Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        userService.checkAccessForStudent(student);

        Map<String, Object> response = new HashMap<>();
        response.put("studentId", studentId);
        if (student.getAssignedShuttle() != null) {
            Shuttle shuttle = student.getAssignedShuttle();
            response.put("assignedShuttleId", shuttle.getShuttleId());
            response.put("route", shuttle.getRoute());
            response.put("driverId", shuttle.getDriver() != null ? shuttle.getDriver().getDriverId() : null);
            response.put("operatorId", shuttle.getOperator() != null ? shuttle.getOperator().getOperatorId() : null);
        } else {
            response.put("message", "No shuttle assigned");
        }
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@userService.isOwnerOrAdminOrParentForStudent(#id)")
    public ResponseEntity<Student> updateStudent(@PathVariable Long id, @RequestBody Student updatedStudent) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        // Update fields
        student.setCurrentAddress(updatedStudent.getCurrentAddress());
        student.setFullName(updatedStudent.getFullName());
        student.setContactPhone(updatedStudent.getContactPhone());
        student.setGrade(updatedStudent.getGrade());
        student.setSection(updatedStudent.getSection());
        // etc.
        studentRepository.save(student);
        return ResponseEntity.ok(student);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteStudent(@PathVariable Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        userRepository.delete(student.getUser());
        studentRepository.delete(student);
        return ResponseEntity.ok(Map.of("message", "Student deleted successfully"));
    }
}