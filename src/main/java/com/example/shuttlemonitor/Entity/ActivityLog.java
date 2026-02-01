package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "activity_logs")
public class ActivityLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long activityId;

    @Column(nullable = false)
    private String message;

    @Column(nullable = false)
    private String type; // e.g., "INFO", "SUCCESS", "WARNING", "ERROR"

    @Column(nullable = false)
    private LocalDateTime timestamp;

    private Long userId; // Optional: user who triggered the event

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}
