package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "drivers")
public class Driver {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column
    private String licenseNumber;

    @Column
    private String contactPhone;

    @Column
    private String emergencyContact;
}