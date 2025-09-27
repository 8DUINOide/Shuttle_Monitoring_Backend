package com.example.shuttlemonitor.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    @JsonIgnore
    private String password;

    @Column(unique = true, nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(nullable = true)
    private LocalDateTime createdAt;

    @Column
    private String profilePicturePath; // New field for profile picture

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<ForgotPassword> forgotPasswords;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}