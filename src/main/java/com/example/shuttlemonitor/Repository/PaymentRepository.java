package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByParent_ParentId(Long parentId);
    List<Payment> findByOperator_OperatorId(Long operatorId);
    List<Payment> findByStudent_StudentId(Long studentId);
}
