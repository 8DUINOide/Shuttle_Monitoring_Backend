package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.Stop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StopRepository extends JpaRepository<Stop, Long> {
}