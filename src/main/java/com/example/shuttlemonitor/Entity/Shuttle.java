package com.example.shuttlemonitor.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "shuttles")
public class Shuttle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long shuttleId;

    private String name; // New: Shuttle Name (e.g., "Shuttle A")

    @Enumerated(EnumType.STRING)
    private Status status = Status.ACTIVE; // New: Status (default ACTIVE)

    private Integer maxCapacity = 50; // New: Max Capacity (default 50, editable)

    @ManyToOne
    @JoinColumn(name = "driver_id")
    private Driver driver;

    @ManyToOne
    @JoinColumn(name = "operator_id")
    private Operator operator;

    private String route; // e.g., "ADNU to Barangay X"

    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "shuttle", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<CheckIn> checkIns = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}