package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.Operator;
import com.example.shuttlemonitor.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OperatorRepository extends JpaRepository<Operator, Long> {
    Optional<Operator> findByUser(User user);
}