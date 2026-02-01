package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Driver;
import com.example.shuttlemonitor.Entity.Role;
import com.example.shuttlemonitor.Repository.DriverRepository;
import com.example.shuttlemonitor.Repository.UserRepository;
import com.example.shuttlemonitor.exception.UnauthorizedAccessException;
import com.example.shuttlemonitor.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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

    @Autowired
    private ActivityLogService activityLogService;

    @GetMapping("/{id}")
    public ResponseEntity<Driver> getDriver(@PathVariable Long id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        userService.checkAccessForDriver(driver);
        return ResponseEntity.ok(driver);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<Driver>> getAllDrivers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "driverId") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {
        Sort sort = Sort.by(sortOrder.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Driver> drivers = driverRepository.findAll(pageable);
        return ResponseEntity.ok(drivers);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@userService.isOwnerOrAdminOrOperatorForDriver(#id)")
    public ResponseEntity<Driver> updateDriver(@PathVariable Long id, @RequestBody Driver updatedDriver) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        // Update fields as needed
        driver.setContactPhone(updatedDriver.getContactPhone());

        driver.setEmergencyContact(updatedDriver.getEmergencyContact());
        // etc.
        driverRepository.save(driver);
        activityLogService.log("Driver updated: " + driver.getFullName(), "INFO");
        return ResponseEntity.ok(driver);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteDriver(@PathVariable Long id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        String name = driver.getFullName();
        driverRepository.delete(driver);
        userRepository.delete(driver.getUser());
        activityLogService.log("Driver deleted: " + name, "WARNING");
        return ResponseEntity.ok(Map.of("message", "Driver deleted successfully"));
    }
}