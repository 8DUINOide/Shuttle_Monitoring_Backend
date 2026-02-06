package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.RideHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RideHistoryRepository extends JpaRepository<RideHistory, Long> {
}
