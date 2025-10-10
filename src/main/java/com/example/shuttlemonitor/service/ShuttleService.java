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

    // Simple ETA calculation (placeholder: based on occupancy/stops; real: integrate Google Maps API)
    public String getETA(Shuttle shuttle) {
        double occupancy = calculateOccupancy(shuttle);
        int estimatedMinutes = (int) (occupancy > 80 ? 30 : 15); // High occupancy = longer ETA
        LocalDateTime etaTime = LocalDateTime.now().plusMinutes(estimatedMinutes);
        return etaTime.toString();
    }

    private boolean hasRecentCheckIn(Long studentId, String type) {
        // Check for recent check-in (last 1 hour, customizable)
        List<CheckIn> recentCheckIns = checkInRepository.findByStudentIdAndDate(studentId, LocalDateTime.now().minusHours(1));
        return recentCheckIns.stream().anyMatch(c -> c.getType().equals(type) && c.getStatus().equals("success"));
    }
}