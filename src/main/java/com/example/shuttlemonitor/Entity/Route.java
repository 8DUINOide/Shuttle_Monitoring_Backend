package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "routes")
public class Route {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column
    private String description;
}