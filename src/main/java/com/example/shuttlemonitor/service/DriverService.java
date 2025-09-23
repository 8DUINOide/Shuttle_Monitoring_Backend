package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.Driver;
import com.example.shuttlemonitor.Repository.DriverRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class DriverService {
    @Autowired
    private DriverRepository driverRepository;

    public ResponseEntity<Driver> createDriver(Driver driver) {
        driverRepository.save(driver);
        return new ResponseEntity<>(driver, HttpStatus.CREATED);
    }

    public ResponseEntity<Driver> getDriver(Long userId) {
        return driverRepository.findById(userId)
                .map(driver -> new ResponseEntity<>(driver, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }
}