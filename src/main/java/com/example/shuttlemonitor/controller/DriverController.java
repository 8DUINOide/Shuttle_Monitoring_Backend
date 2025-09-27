package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Driver;
import com.example.shuttlemonitor.Entity.Role;
import com.example.shuttlemonitor.Repository.DriverRepository;
import com.example.shuttlemonitor.Repository.UserRepository;
import com.example.shuttlemonitor.exception.UnauthorizedAccessException;
import com.example.shuttlemonitor.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/drivers")
public class DriverController {

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<Driver> getDriver(@PathVariable Long id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        userService.checkAccessForDriver(driver);
        return ResponseEntity.ok(driver);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@userService.isOwnerOrAdminOrOperatorForDriver(#id)")
    public ResponseEntity<Driver> updateDriver(@PathVariable Long id, @RequestBody Driver updatedDriver) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        // Update fields as needed
        driver.setContactPhone(updatedDriver.getContactPhone());
        driver.setLicenseNumber(updatedDriver.getLicenseNumber());
        driver.setEmergencyContact(updatedDriver.getEmergencyContact());
        // etc.
        driverRepository.save(driver);
        return ResponseEntity.ok(driver);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteDriver(@PathVariable Long id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        userRepository.delete(driver.getUser());
        driverRepository.delete(driver);
        return ResponseEntity.ok(Map.of("message", "Driver deleted successfully"));
    }
}