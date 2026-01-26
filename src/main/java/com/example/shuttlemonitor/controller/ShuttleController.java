package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Driver;
import com.example.shuttlemonitor.Entity.Operator;
import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Entity.Status;
import com.example.shuttlemonitor.Repository.DriverRepository;
import com.example.shuttlemonitor.Repository.OperatorRepository;
import com.example.shuttlemonitor.Repository.ShuttleRepository;
import com.example.shuttlemonitor.service.ShuttleService;
import com.example.shuttlemonitor.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/shuttles")
public class ShuttleController {

    @Autowired
    private ShuttleRepository shuttleRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private OperatorRepository operatorRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private ShuttleService shuttleService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createShuttle(@RequestBody Map<String, Object> request) {
        Long driverId = Long.parseLong(request.get("driverId").toString());
        Long operatorId = Long.parseLong(request.get("operatorId").toString());
        String route = (String) request.get("route");
        String name = (String) request.get("name");
        String licensePlate = (String) request.get("licensePlate"); // New
        Integer maxCapacity = request.get("maxCapacity") != null ? Integer.parseInt(request.get("maxCapacity").toString()) : 50;

        if (route == null || route.trim().isEmpty()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Route is required");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        userService.checkAccessForDriver(driver);

        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> new IllegalArgumentException("Operator not found"));
        userService.checkAccessForOperator(operator);

        Shuttle shuttle = new Shuttle();
        shuttle.setName(name != null ? name : "Shuttle " + route);
        shuttle.setMaxCapacity(maxCapacity);
        shuttle.setDriver(driver);
        shuttle.setOperator(operator);
        shuttle.setRoute(route);
        shuttle.setLicensePlate(licensePlate); // New
        shuttle = shuttleRepository.save(shuttle);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Shuttle created successfully");
        response.put("shuttleId", shuttle.getShuttleId());
        response.put("name", shuttle.getName());
        response.put("route", shuttle.getRoute());
        response.put("licensePlate", shuttle.getLicensePlate()); // New
        response.put("status", shuttle.getStatus());
        response.put("maxCapacity", shuttle.getMaxCapacity());
        response.put("assignedStudentsCount", shuttle.getAssignedStudentsCount()); // New
        response.put("occupancy", shuttleService.calculateOccupancy(shuttle));
        response.put("nextStop", shuttleService.getNextStop(shuttle));
        response.put("eta", shuttleService.getETA(shuttle));
        response.put("driverId", driverId);
        response.put("operatorId", operatorId);
        response.put("createdAt", shuttle.getCreatedAt().toString());
        // New: Location
        response.put("latitude", shuttle.getLatitude());
        response.put("longitude", shuttle.getLongitude());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getShuttle(@PathVariable Long id) {
        Shuttle shuttle = shuttleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shuttle not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("shuttleId", shuttle.getShuttleId());
        response.put("name", shuttle.getName());
        response.put("status", shuttle.getStatus());
        response.put("maxCapacity", shuttle.getMaxCapacity() != null ? shuttle.getMaxCapacity() : 50);
        response.put("assignedStudentsCount", shuttle.getAssignedStudentsCount()); // New
        response.put("occupancy", shuttleService.calculateOccupancy(shuttle));
        response.put("nextStop", shuttleService.getNextStop(shuttle));
        response.put("eta", shuttleService.getETA(shuttle));
        response.put("route", shuttle.getRoute());
        response.put("licensePlate", shuttle.getLicensePlate()); // New
        response.put("driver", Map.of(
                "driverId", shuttle.getDriver().getDriverId(),
                "username", shuttle.getDriver().getUser().getUsername()
        ));
        response.put("operator", Map.of(
                "operatorId", shuttle.getOperator().getOperatorId(),
                "username", shuttle.getOperator().getUser().getUsername()
        ));
        response.put("createdAt", shuttle.getCreatedAt().toString());
        // New: Location
        response.put("latitude", shuttle.getLatitude());
        response.put("longitude", shuttle.getLongitude());

        // New: Include ALL assigned students locations for visualization
        List<Map<String, Object>> studentLocations = shuttleService.getAssignedStudentLocations(shuttle);
        response.put("assignedStudentLocations", studentLocations);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<Shuttle>> getAllShuttles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "shuttleId") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {
        Sort sort = Sort.by(sortOrder.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Shuttle> shuttles = shuttleRepository.findAll(pageable);
        return ResponseEntity.ok(shuttles);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') OR hasRole('DRIVER') OR hasRole('OPERATOR')")
    public ResponseEntity<Map<String, Object>> updateShuttle(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        Shuttle shuttle = shuttleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shuttle not found"));

        // Editable fields: status, maxCapacity (by DRIVER/OPERATOR/ADMIN)
        if (request.containsKey("status")) {
            shuttle.setStatus(Status.valueOf((String) request.get("status")));
        }
        if (request.containsKey("maxCapacity")) {
            shuttle.setMaxCapacity(Integer.parseInt(request.get("maxCapacity").toString()));
        }

        // Route/driver/operator updates (admin-only, but since PreAuthorize allows, add check if needed)
        if (request.containsKey("route")) {
            shuttle.setRoute((String) request.get("route"));
        }
        if (request.containsKey("licensePlate")) { // New
            shuttle.setLicensePlate((String) request.get("licensePlate"));
        }
        if (request.containsKey("driverId")) {
            Long driverId = Long.parseLong(request.get("driverId").toString());
            Driver driver = driverRepository.findById(driverId)
                    .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
            shuttle.setDriver(driver);
        }
        if (request.containsKey("operatorId")) {
            Long operatorId = Long.parseLong(request.get("operatorId").toString());
            Operator operator = operatorRepository.findById(operatorId)
                    .orElseThrow(() -> new IllegalArgumentException("Operator not found"));
            shuttle.setOperator(operator);
        }

        shuttle = shuttleRepository.save(shuttle);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Shuttle updated successfully");
        response.put("shuttleId", shuttle.getShuttleId());
        response.put("name", shuttle.getName());
        response.put("status", shuttle.getStatus());
        response.put("maxCapacity", shuttle.getMaxCapacity() != null ? shuttle.getMaxCapacity() : 50);
        response.put("assignedStudentsCount", shuttle.getAssignedStudentsCount()); // New
        response.put("occupancy", shuttleService.calculateOccupancy(shuttle));
        response.put("nextStop", shuttleService.getNextStop(shuttle));
        response.put("eta", shuttleService.getETA(shuttle));
        response.put("route", shuttle.getRoute());
        response.put("licensePlate", shuttle.getLicensePlate()); // New
        // New: Location
        response.put("latitude", shuttle.getLatitude());
        response.put("longitude", shuttle.getLongitude());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> deleteShuttle(@PathVariable Long id) {
        shuttleService.deleteShuttle(id);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Shuttle deleted successfully");
        response.put("shuttleId", id);

        return ResponseEntity.ok(response);
    }

    // New: Update Location Endpoint (For Hardware)
    @PostMapping("/{id}/location")
    public ResponseEntity<Map<String, Object>> updateLocation(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        Shuttle shuttle = shuttleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shuttle not found"));

        if (request.containsKey("latitude") && request.containsKey("longitude")) {
            shuttle.setLatitude(Double.parseDouble(request.get("latitude").toString()));
            shuttle.setLongitude(Double.parseDouble(request.get("longitude").toString()));
            shuttleRepository.save(shuttle);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Location updated successfully");
            response.put("shuttleId", shuttle.getShuttleId());
            response.put("latitude", shuttle.getLatitude());
            response.put("longitude", shuttle.getLongitude());
            response.put("eta", shuttleService.getETA(shuttle)); // New: Return updated ETA
            
            // New: Include Target Student Location for Routing
            com.example.shuttlemonitor.Entity.Student nextStudent = shuttleService.getNextStudent(shuttle);
            if (nextStudent != null) {
                response.put("targetLatitude", nextStudent.getLatitude());
                response.put("targetLongitude", nextStudent.getLongitude());
            }

             // New: Include ALL assigned students locations for visualization
            List<Map<String, Object>> studentLocations = shuttleService.getAssignedStudentLocations(shuttle);
            response.put("assignedStudentLocations", studentLocations);

            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Latitude and Longitude are required");
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}