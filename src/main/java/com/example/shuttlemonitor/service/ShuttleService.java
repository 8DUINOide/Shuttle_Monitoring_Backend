package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.CheckIn;
import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Entity.Status;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Repository.CheckInRepository;
import com.example.shuttlemonitor.Repository.ShuttleRepository;
import com.example.shuttlemonitor.Repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class ShuttleService {

    @Autowired
    private ShuttleRepository shuttleRepository;

    @Autowired
    private CheckInRepository checkInRepository;

    @Autowired
    private StudentRepository studentRepository;

    public Shuttle getShuttleById(Long shuttleId) {
        return shuttleRepository.findById(shuttleId)
                .orElseThrow(() -> new IllegalArgumentException("Shuttle not found"));
    }

    // Updated: Calculate occupancy with null-safe maxCapacity (fallback to 50)
    public double calculateOccupancy(Shuttle shuttle) {
        Long activeCheckIns = shuttleRepository.countActiveOccupancy(shuttle.getShuttleId());
        Integer capacity = shuttle.getMaxCapacity() != null ? shuttle.getMaxCapacity() : 50;  // Fix: Fallback for null
        return (double) activeCheckIns / capacity * 100; // Percentage
    }

    // Determine next stop (next student's currentAddress, sorted by route logic - simple alphabetical for now)
    public String getNextStop(Shuttle shuttle) {
        // Get students assigned to this shuttle with recent "in" check-in
        List<Student> assignedStudents = studentRepository.findByAssignedShuttle(shuttle);
        if (assignedStudents.isEmpty()) {
            return "No students assigned";
        }

        // Simple logic: Sort by currentAddress alphabetically (real impl: use geolocation/route order)
        Optional<Student> nextStudent = assignedStudents.stream()
                .filter(s -> hasRecentCheckIn(s.getStudentId(), "in")) // Recent "in" not "out"
                .min(Comparator.comparing(s -> s.getCurrentAddress()));

        return nextStudent.map(Student::getCurrentAddress).orElse("End of route");
    }

    // New: Get Next Student's Location (Lat/Lng) for Routing
    public Student getNextStudent(Shuttle shuttle) {
        List<Student> assignedStudents = studentRepository.findByAssignedShuttle(shuttle);
        if (assignedStudents.isEmpty()) {
            return null;
        }
        // Logic: Find first student with valid Lat/Lng (Simulation: usually just one active student)
        // Improvement: Filter by those who have "Pin" set
        return assignedStudents.stream()
                .filter(s -> s.getLatitude() != null && s.getLongitude() != null)
                .findFirst() // Just pick the first for now (Simulation)
                .orElse(null);
    }

    // New: Get All Assigned Students Locations
    public List<java.util.Map<String, Object>> getAssignedStudentLocations(Shuttle shuttle) {
        List<Student> assignedStudents = studentRepository.findByAssignedShuttle(shuttle);
        return assignedStudents.stream()
                .map(s -> {
                    java.util.Map<String, Object> map = new java.util.HashMap<>();
                    map.put("studentId", s.getStudentId());
                    map.put("name", s.getFullName()); // Or just "Student #" + id
                    map.put("latitude", s.getLatitude());
                    map.put("longitude", s.getLongitude());
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    @Autowired
    private MapboxService mapboxService;

    // Updated: ETA calculation using Mapbox Directions API for real-time data
    public String getETA(Shuttle shuttle) {
        if (shuttle.getLatitude() == null || shuttle.getLongitude() == null) {
            return "Location not set";
        }

        // Use Driver's Destination if set, otherwise fallback to legacy behavior
        Double destLat = shuttle.getDestinationLatitude();
        Double destLng = shuttle.getDestinationLongitude();

        if (destLat != null && destLng != null) {
            // Use Mapbox Directions API for real ETA
            return mapboxService.getETA(shuttle.getLatitude(), shuttle.getLongitude(), destLat, destLng);
        }

        // Fallback: No destination set
        return "Set destination";
    }

    // Legacy distance calculation (kept for reference/fallback)
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private boolean hasRecentCheckIn(Long studentId, String type) {
        // Check for recent check-in (last 1 hour, customizable)
        List<CheckIn> recentCheckIns = checkInRepository.findByStudentIdAndDate(studentId, LocalDateTime.now().minusHours(1));
        return recentCheckIns.stream().anyMatch(c -> c.getType().equals(type) && c.getStatus().equals("success"));
    }

    public void deleteShuttle(Long shuttleId) {
        Shuttle shuttle = getShuttleById(shuttleId);
        List<Student> assignedStudents = studentRepository.findByAssignedShuttle(shuttle);
        for (Student student : assignedStudents) {
            student.setAssignedShuttle(null);
            studentRepository.save(student);
        }
        shuttleRepository.delete(shuttle);
    }
}