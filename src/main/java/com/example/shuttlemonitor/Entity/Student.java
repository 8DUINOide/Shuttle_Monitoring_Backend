package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "students")
public class Student {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column
    private String fullName;

    @Column
    private String grade;

    @Column
    private String section;

    @Column(unique = true)
    private String rfidTag;

    @Column
    private String fingerprintHash;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Parent parent;
}