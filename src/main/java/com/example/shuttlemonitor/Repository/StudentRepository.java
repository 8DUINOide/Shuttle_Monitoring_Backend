package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByUser(User user);
    Optional<Student> findByRfidTag(String rfidTag);
    Optional<Student> findByFingerprintHash(String fingerprintHash);

    // New: Find students assigned to a shuttle
    @Query("SELECT s FROM Student s WHERE s.assignedShuttle = :shuttle")
    List<Student> findByAssignedShuttle(Shuttle shuttle);
}