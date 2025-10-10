package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CheckInRepository extends JpaRepository<CheckIn, Long> {
    @Query("SELECT c FROM CheckIn c WHERE c.student.user.userId = :studentId AND c.timestamp >= :startDate")
    List<CheckIn> findByStudentIdAndDate(@Param("studentId") Long studentId, @Param("startDate") LocalDateTime startDate);
}