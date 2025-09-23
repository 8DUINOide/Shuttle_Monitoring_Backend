package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CheckInRepository extends JpaRepository<CheckIn, Long> {
}