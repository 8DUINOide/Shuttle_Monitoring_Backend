package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "check_ins")
public class CheckIn {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne
    @JoinColumn(name = "shuttle_id")
    private Shuttle shuttle;

    @Column(nullable = false)
    private String checkType; // 'IN', 'OUT'

    @Column
    private LocalDateTime timestamp;

    @Column
    private Double locationLat;

    @Column
    private Double locationLng;
}