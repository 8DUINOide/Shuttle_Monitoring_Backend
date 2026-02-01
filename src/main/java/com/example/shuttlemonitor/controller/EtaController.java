package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Repository.ShuttleRepository;
import com.example.shuttlemonitor.Repository.StudentRepository;
import com.example.shuttlemonitor.service.MapboxService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for ETA (Estimated Time of Arrival) endpoints.
 * Uses Mapbox Directions API for real-time distance and duration calculations.
 */
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/eta")
public class EtaController {

    @Autowired
    private ShuttleRepository shuttleRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private MapboxService mapboxService;

    /**
     * Get ETA from a Shuttle's current location to its Destination.
     * 
     * @param id Shuttle ID
     * @return ETA details including distance and duration
     */
    @GetMapping("/shuttle/{id}")
    public ResponseEntity<Map<String, Object>> getShuttleETA(@PathVariable Long id) {
        Shuttle shuttle = shuttleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shuttle not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("shuttleId", shuttle.getShuttleId());
        response.put("shuttleName", shuttle.getName());

        // Origin: Shuttle's current location
        response.put("origin", Map.of(
                "lat", shuttle.getLatitude() != null ? shuttle.getLatitude() : 0,
                "lng", shuttle.getLongitude() != null ? shuttle.getLongitude() : 0
        ));

        // Destination: Driver's set destination
        response.put("destination", Map.of(
                "lat", shuttle.getDestinationLatitude() != null ? shuttle.getDestinationLatitude() : 0,
                "lng", shuttle.getDestinationLongitude() != null ? shuttle.getDestinationLongitude() : 0
        ));

        // Calculate ETA using Mapbox
        if (shuttle.getLatitude() != null && shuttle.getLongitude() != null &&
            shuttle.getDestinationLatitude() != null && shuttle.getDestinationLongitude() != null) {
            
            Map<String, Object> directions = mapboxService.getDirections(
                    shuttle.getLongitude(), shuttle.getLatitude(),
                    shuttle.getDestinationLongitude(), shuttle.getDestinationLatitude()
            );

            response.put("distance", directions.get("distance"));
            response.put("duration", directions.get("duration"));
            response.put("eta", directions.get("eta"));
            response.put("distanceMeters", directions.get("distanceMeters"));
            response.put("durationSeconds", directions.get("durationSeconds"));
        } else {
            response.put("distance", "Unknown");
            response.put("duration", "Unknown");
            response.put("eta", "Set destination first");
        }

        response.put("updatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

        return ResponseEntity.ok(response);
    }

    /**
     * Get ETAs from Shuttle to each assigned Student's location.
     * 
     * @param id Shuttle ID
     * @return List of student ETAs
     */
    @GetMapping("/shuttle/{id}/students")
    public ResponseEntity<Map<String, Object>> getStudentETAs(@PathVariable Long id) {
        Shuttle shuttle = shuttleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shuttle not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("shuttleId", shuttle.getShuttleId());
        response.put("shuttleName", shuttle.getName());
        response.put("shuttleLocation", Map.of(
                "lat", shuttle.getLatitude() != null ? shuttle.getLatitude() : 0,
                "lng", shuttle.getLongitude() != null ? shuttle.getLongitude() : 0
        ));

        List<Student> assignedStudents = studentRepository.findByAssignedShuttle(shuttle);
        List<Map<String, Object>> studentETAs = new ArrayList<>();

        for (Student student : assignedStudents) {
            Map<String, Object> studentETA = new HashMap<>();
            studentETA.put("studentId", student.getStudentId());
            studentETA.put("name", student.getFullName());
            studentETA.put("location", Map.of(
                    "lat", student.getLatitude() != null ? student.getLatitude() : 0,
                    "lng", student.getLongitude() != null ? student.getLongitude() : 0
            ));

            // Calculate ETA to this student
            if (shuttle.getLatitude() != null && shuttle.getLongitude() != null &&
                student.getLatitude() != null && student.getLongitude() != null) {
                
                Map<String, Object> directions = mapboxService.getDirections(
                        shuttle.getLongitude(), shuttle.getLatitude(),
                        student.getLongitude(), student.getLatitude()
                );

                studentETA.put("distance", directions.get("distance"));
                studentETA.put("duration", directions.get("duration"));
                studentETA.put("eta", directions.get("eta"));
            } else {
                studentETA.put("distance", "Unknown");
                studentETA.put("duration", "Unknown");
                studentETA.put("eta", "Location not set");
            }

            studentETAs.add(studentETA);
        }

        response.put("students", studentETAs);
        response.put("totalStudents", assignedStudents.size());
        response.put("updatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

        return ResponseEntity.ok(response);
    }
}
