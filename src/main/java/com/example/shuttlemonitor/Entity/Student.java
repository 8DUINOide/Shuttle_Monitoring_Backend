package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long studentId;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String fullName;

    private String contactPhone;

    private String currentAddress;

    private String grade;

    private String section;

    private String rfidTag;

    @Column(name = "fingerprint_hash1")
    private String fingerprintHash1;

    @Column(name = "fingerprint_hash2")
    private String fingerprintHash2;

    @Column(name = "fingerprint_hash3")
    private String fingerprintHash3;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Parent parent;

    @ManyToOne
    @JoinColumn(name = "assigned_shuttle_id")
    private Shuttle assignedShuttle;

    // New: Student's Current Location (Pin)
    private Double latitude;
    private Double longitude;
}