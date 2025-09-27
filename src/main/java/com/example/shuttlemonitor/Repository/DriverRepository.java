package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.Driver;
import com.example.shuttlemonitor.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {
    Optional<Driver> findByUser(User user);
}