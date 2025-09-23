package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "stops")
public class Stop {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column
    private Double lat;

    @Column
    private Double lng;

    @Column
    private Integer sequenceOrder;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;
}