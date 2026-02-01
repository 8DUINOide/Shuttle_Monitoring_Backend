package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.CheckIn;
import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Repository.CheckInRepository;
import com.example.shuttlemonitor.Repository.ShuttleRepository;
import com.example.shuttlemonitor.Repository.StudentRepository;
import com.example.shuttlemonitor.service.ActivityLogService;
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

    @Autowired
    private ActivityLogService activityLogService;

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


    public CheckIn processSecureCheckIn(String rfidTag, String fingerprintHash, Long shuttleId) {
        // Step 1: Find Student by RFID (First Factor)
        Optional<Student> studentOpt = studentRepository.findByRfidTag(rfidTag);
        if (studentOpt.isEmpty()) {
            throw new IllegalArgumentException("RFID not recognized: " + rfidTag);
        }
        Student student = studentOpt.get();

        // Step 2: Verify Fingerprint (Second Factor)
        if (student.getFingerprintHash() == null || !student.getFingerprintHash().equals(fingerprintHash)) {
             // Log failed attempt?
             CheckIn failed = new CheckIn();
             failed.setStudent(student);
             failed.setStatus("failed - 2fa mismatch");
             failed.setRfidTag(rfidTag);
             failed.setFingerprintHash(fingerprintHash);
             failed.setType("unknown");
             // We need a shuttle to save, even if failed? Or make nullable?
             // For now, let's try to find the shuttle to log it against.
             shuttleRepository.findById(shuttleId).ifPresent(failed::setShuttle); 
             checkInRepository.save(failed);

             throw new IllegalArgumentException("Fingerprint verification failed for student: " + student.getFullName());
        }

        Optional<Shuttle> shuttleOpt = shuttleRepository.findById(shuttleId);
        if (shuttleOpt.isEmpty()) {
            throw new IllegalArgumentException("Shuttle not found");
        }
        Shuttle shuttle = shuttleOpt.get();

        // Step 3: Verify Assignment
        if (student.getAssignedShuttle() == null || !student.getAssignedShuttle().getShuttleId().equals(shuttleId)) {
             throw new IllegalArgumentException("Student is not assigned to this shuttle.");
        }

        // Step 4: Determine In/Out
        CheckIn lastCheckIn = checkInRepository.findTopByStudent_StudentIdOrderByTimestampDesc(student.getStudentId());
        String newType = "in";
        if (lastCheckIn != null && "in".equals(lastCheckIn.getType())) {
            newType = "out";
        }

        CheckIn checkIn = new CheckIn();
        checkIn.setStudent(student);
        checkIn.setShuttle(shuttle);
        checkIn.setType(newType);
        checkIn.setStatus("success");
        checkIn.setRfidTag(rfidTag);
        checkIn.setFingerprintHash(fingerprintHash);

        activityLogService.log(
            String.format("%s checked %s to %s (Secure)", student.getFullName(), newType, shuttle.getName()),
            "SUCCESS",
            student.getUser().getUserId()
        );

        return checkInRepository.save(checkIn);
    }
    public java.util.List<CheckIn> getAllCheckIns() {
        return checkInRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "timestamp"));
    }
}