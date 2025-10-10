package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.CheckIn;
import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Repository.CheckInRepository;
import com.example.shuttlemonitor.Repository.ShuttleRepository;
import com.example.shuttlemonitor.Repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Transactional
public class CheckInService {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private ShuttleRepository shuttleRepository;

    @Autowired
    private CheckInRepository checkInRepository;

    public Student getStudentById(Long studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
    }
    public CheckIn registerDevice(Long studentId, String rfidTag, String fingerprintHash) {
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isEmpty()) {
            throw new IllegalArgumentException("Student not found");
        }
        Student student = studentOpt.get();
        student.setRfidTag(rfidTag);
        student.setFingerprintHash(fingerprintHash);
        studentRepository.save(student);
        return null; // Or return confirmation object if needed
    }

    public CheckIn logCheckIn(Long studentId, Long shuttleId, String rfidTag, String fingerprintHash, String type) {
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isEmpty()) {
            throw new IllegalArgumentException("Student not found");
        }
        Student student = studentOpt.get();

        // Verify RFID/Fingerprint
        if (!rfidTag.equals(student.getRfidTag()) || !fingerprintHash.equals(student.getFingerprintHash())) {
            CheckIn failedCheckIn = new CheckIn();
            failedCheckIn.setStudent(student);
            failedCheckIn.setStatus("failed");
            failedCheckIn.setRfidTag(rfidTag);
            failedCheckIn.setFingerprintHash(fingerprintHash);
            failedCheckIn.setType(type);
            return checkInRepository.save(failedCheckIn);
        }

        Optional<Shuttle> shuttleOpt = shuttleRepository.findById(shuttleId);
        if (shuttleOpt.isEmpty()) {
            throw new IllegalArgumentException("Shuttle not found");
        }
        Shuttle shuttle = shuttleOpt.get();

        CheckIn checkIn = new CheckIn();
        checkIn.setStudent(student);
        checkIn.setShuttle(shuttle);
        checkIn.setType(type); // "in" or "out"
        checkIn.setStatus("success");
        checkIn.setRfidTag(rfidTag);
        checkIn.setFingerprintHash(fingerprintHash);
        return checkInRepository.save(checkIn);
    }
}