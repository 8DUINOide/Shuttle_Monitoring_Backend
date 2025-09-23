package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.CheckIn;
import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Repository.CheckInRepository;
import com.example.shuttlemonitor.Repository.ShuttleRepository;
import com.example.shuttlemonitor.Repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class CheckInService {
    @Autowired
    private CheckInRepository checkInRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private ShuttleRepository shuttleRepository;

    @Transactional
    public ResponseEntity<CheckIn> createCheckIn(String rfidTag, Long shuttleId, String checkType, Double locationLat, Double locationLng) {
        Student student = studentRepository.findByRfidTag(rfidTag)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with RFID: " + rfidTag));
        Shuttle shuttle = shuttleRepository.findById(shuttleId)
                .orElseThrow(() -> new IllegalArgumentException("Shuttle not found with ID: " + shuttleId));

        if (!checkType.equals("IN") && !checkType.equals("OUT")) {
            throw new IllegalArgumentException("Invalid check type: " + checkType);
        }

        if (checkType.equals("IN")) {
            shuttle.setCurrentOccupancy(shuttle.getCurrentOccupancy() + 1);
        } else {
            shuttle.setCurrentOccupancy(Math.max(0, shuttle.getCurrentOccupancy() - 1));
        }
        shuttle.setLastUpdated(LocalDateTime.now());
        shuttleRepository.save(shuttle);

        CheckIn checkIn = new CheckIn();
        checkIn.setStudent(student);
        checkIn.setShuttle(shuttle);
        checkIn.setCheckType(checkType);
        checkIn.setTimestamp(LocalDateTime.now());
        checkIn.setLocationLat(locationLat);
        checkIn.setLocationLng(locationLng);
        checkInRepository.save(checkIn);

        return new ResponseEntity<>(checkIn, HttpStatus.CREATED);
    }
}