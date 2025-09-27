package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Driver {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long driverId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String licenseNumber;

    private String contactPhone;

    private String emergencyContact;

    @ManyToOne
    @JoinColumn(name = "operator_id")
    private Operator operator;
}