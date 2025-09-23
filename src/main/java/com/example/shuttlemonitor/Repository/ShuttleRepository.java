package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.Shuttle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShuttleRepository extends JpaRepository<Shuttle, Long> {
}