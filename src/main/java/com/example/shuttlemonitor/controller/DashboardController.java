package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Entity.Status;
import com.example.shuttlemonitor.Repository.CheckInRepository;
import com.example.shuttlemonitor.Repository.ShuttleRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/admin/dashboard")
public class DashboardController {

    @Autowired
    private ShuttleRepository shuttleRepository;

    @Autowired
    private CheckInRepository checkInRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        List<Shuttle> allShuttles = shuttleRepository.findAll();

        long activeShuttlesCount = allShuttles.stream()
                .filter(s -> s.getStatus() == Status.ACTIVE)
                .count();

        long activeRoutesCount = allShuttles.stream()
                .filter(s -> s.getStatus() == Status.ACTIVE && s.getRoute() != null)
                .map(Shuttle::getRoute)
                .distinct()
                .count();

        // Students checked in today (since midnight)
        LocalDateTime since = LocalDate.now().atStartOfDay();
        long checkedInStudentsCount = checkInRepository.countCurrentlyCheckedIn(since);

        // On-Time Performance (Placeholder for now, could be calculated based on historical data)
        int onTimePerformance = activeRoutesCount > 0 ? 100 : 0; 

        Map<String, Object> stats = new HashMap<>();
        stats.put("activeShuttlesCount", activeShuttlesCount);
        stats.put("checkedInStudentsCount", checkedInStudentsCount);
        stats.put("activeRoutesCount", activeRoutesCount);
        stats.put("onTimePerformance", onTimePerformance);

        return ResponseEntity.ok(stats);
    }
}
