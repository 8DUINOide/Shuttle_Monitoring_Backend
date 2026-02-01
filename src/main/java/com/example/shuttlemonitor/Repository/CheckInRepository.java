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

    CheckIn findTopByStudent_StudentIdOrderByTimestampDesc(Long studentId);

    @Query(value = "SELECT COUNT(*) FROM (\n" +
            "    SELECT DISTINCT ON (student_id) type, status \n" +
            "    FROM check_ins \n" +
            "    WHERE timestamp >= :since \n" +
            "    ORDER BY student_id, timestamp DESC\n" +
            ") as latest_checks \n" +
            "WHERE type = 'in' AND status = 'success'", nativeQuery = true)
    Long countCurrentlyCheckedIn(@Param("since") LocalDateTime since);

    void deleteByStudent(com.example.shuttlemonitor.Entity.Student student);
}