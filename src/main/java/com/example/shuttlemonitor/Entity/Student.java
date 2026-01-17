package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
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

    private String fingerprintHash;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Parent parent;

    @ManyToOne
    @JoinColumn(name = "assigned_shuttle_id")
    private Shuttle assignedShuttle;  // New: Assigned shuttle for the student
}