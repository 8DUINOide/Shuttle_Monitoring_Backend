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
@Table(name = "check_ins")
public class CheckIn {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long checkInId;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne
    @JoinColumn(name = "shuttle_id")
    private Shuttle shuttle;

    private String type; // "in" or "out"

    private String status; // "success" or "failed"

    private LocalDateTime timestamp;

    private String rfidTag; // Logged for audit

    private String fingerprintHash; // Logged for audit

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}