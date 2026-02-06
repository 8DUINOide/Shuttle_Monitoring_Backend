package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "shuttle_ride_history")
public class RideHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long rideId;

    private Long shuttleId;
    private String shuttleName;
    private String driverName;
    private String route;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private Double startLatitude;
    private Double startLongitude;
    private Double endLatitude;
    private Double endLongitude;

    @PrePersist
    protected void onEnd() {
        if (endTime == null) {
            endTime = LocalDateTime.now();
        }
    }
}
