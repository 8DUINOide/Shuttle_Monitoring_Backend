package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "parents")
public class Parent {
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
    private String contactPhone;
}