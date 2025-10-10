package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Driver;
import com.example.shuttlemonitor.Entity.Operator;
import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Repository.DriverRepository;
import com.example.shuttlemonitor.Repository.OperatorRepository;
import com.example.shuttlemonitor.Repository.ShuttleRepository;
import com.example.shuttlemonitor.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.beans.factory.annotation.Autowired;
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

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> createShuttle(@RequestBody Map<String, Object> request) {
        Long driverId = Long.parseLong(request.get("driverId").toString());
        Long operatorId = Long.parseLong(request.get("operatorId").toString());
        String route = (String) request.get("route");

        if (route == null || route.trim().isEmpty()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Route is required");
            return ResponseEntity.badRequest().body(errorResponse);
        }

        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        userService.checkAccessForDriver(driver); // Ensure access

        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> new IllegalArgumentException("Operator not found"));
        userService.checkAccessForOperator(operator); // Ensure access

        Shuttle shuttle = new Shuttle();
        shuttle.setDriver(driver);
        shuttle.setOperator(operator);
        shuttle.setRoute(route);
        shuttle = shuttleRepository.save(shuttle);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Shuttle created successfully");
        response.put("shuttleId", shuttle.getShuttleId());
        response.put("route", shuttle.getRoute());
        response.put("driverId", driverId);
        response.put("operatorId", operatorId);
        response.put("createdAt", shuttle.getCreatedAt().toString());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getShuttle(@PathVariable Long id) {
        Shuttle shuttle = shuttleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shuttle not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("shuttleId", shuttle.getShuttleId());
        response.put("route", shuttle.getRoute());
        response.put("driver", Map.of(
                "driverId", shuttle.getDriver().getDriverId(),
                "username", shuttle.getDriver().getUser().getUsername()
        ));
        response.put("operator", Map.of(
                "operatorId", shuttle.getOperator().getOperatorId(),
                "username", shuttle.getOperator().getUser().getUsername()
        ));
        response.put("createdAt", shuttle.getCreatedAt().toString());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Shuttle>> getAllShuttles(
            @RequestParam(defaultValue = "shuttleId") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {
        Sort sort = Sort.by(sortOrder.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sortBy);
        List<Shuttle> shuttles = shuttleRepository.findAll(sort);
        return ResponseEntity.ok(shuttles);
    }
}