package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class StudentService {
    @Autowired
    private StudentRepository studentRepository;

    public ResponseEntity<Student> createStudent(Student student) {
        studentRepository.save(student);
        return new ResponseEntity<>(student, HttpStatus.CREATED);
    }

    public ResponseEntity<Student> getStudent(Long userId) {
        return studentRepository.findById(userId)
                .map(student -> new ResponseEntity<>(student, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }

    public ResponseEntity<Student> getStudentByRfidTag(String rfidTag) {
        return studentRepository.findByRfidTag(rfidTag)
                .map(student -> new ResponseEntity<>(student, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }
}