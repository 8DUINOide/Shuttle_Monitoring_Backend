package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private String message;

    @Column
    private LocalDateTime timestamp;

    @Column
    private String status; // 'UNREAD', 'READ'

    @ManyToOne
    @JoinColumn(name = "recipient_id")
    private User recipient;
}