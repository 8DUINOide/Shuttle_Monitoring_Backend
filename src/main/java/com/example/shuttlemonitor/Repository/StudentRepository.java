package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByUser(User user);
    Optional<Student> findByRfidTag(String rfidTag);
}