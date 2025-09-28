package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Repository.StudentRepository;
import com.example.shuttlemonitor.Repository.UserRepository;
import com.example.shuttlemonitor.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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