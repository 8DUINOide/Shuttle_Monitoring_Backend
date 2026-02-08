package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByUser(User user);
    Optional<Student> findByRfidTag(String rfidTag);
    @Query("SELECT s FROM Student s WHERE s.fingerprintHash1 = :hash OR s.fingerprintHash2 = :hash OR s.fingerprintHash3 = :hash")
    Optional<Student> findByAnyFingerprint(@Param("hash") String hash);

    // New: Find students assigned to a shuttle
    @Query("SELECT s FROM Student s WHERE s.assignedShuttle = :shuttle")
    List<Student> findByAssignedShuttle(Shuttle shuttle);

    @Query("SELECT s FROM Student s WHERE s.assignedShuttle.operator.operatorId = :operatorId")
    List<Student> findByOperatorId(@Param("operatorId") Long operatorId);

    List<Student> findByParent_ParentId(Long parentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Student s WHERE s.studentId = :id")
    Optional<Student> findByIdLocked(@Param("id") Long id);
}