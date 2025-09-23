package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "shuttles")
public class Shuttle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer capacity;

    @Column(nullable = false)
    private String status; // e.g., 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ON_TIME', 'DELAYED'

    @Column
    private Integer currentOccupancy;

    @Column
    private Double locationLat;

    @Column
    private Double locationLng;

    @ManyToOne
    @JoinColumn(name = "driver_id")
    private Driver driver;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    @Column
    private LocalDateTime lastUpdated;
}