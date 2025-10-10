package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.Shuttle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShuttleRepository extends JpaRepository<Shuttle, Long> {
    // New: Optional query for occupancy calculation (count active check-ins)
    @Query("SELECT COUNT(c) FROM CheckIn c WHERE c.shuttle.shuttleId = :shuttleId AND c.type = 'in' AND c.status = 'success'")
    Long countActiveOccupancy(@Param("shuttleId") Long shuttleId);
}