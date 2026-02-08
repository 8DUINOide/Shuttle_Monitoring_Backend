package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.Operator;
import com.example.shuttlemonitor.Entity.Payment;
import com.example.shuttlemonitor.Entity.PaymentStatus;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Repository.OperatorRepository;
import com.example.shuttlemonitor.Repository.PaymentRepository;
import com.example.shuttlemonitor.Repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private OperatorRepository operatorRepository;

    public List<Payment> getAllPayments() {
        checkOverduePayments();
        return paymentRepository.findAll();
    }

    public Payment createPayment(Long studentId, Long operatorId, Double amount, LocalDateTime dueDate, String paymentType, String billingMonth, String paymentPlan) {
        System.out.println("Processing payment creation for studentId: " + studentId + ", operatorId: " + operatorId);
        
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));
        Operator operator = operatorRepository.findById(operatorId)
                .orElseThrow(() -> new RuntimeException("Operator not found"));

        Payment payment = new Payment();
        payment.setStudent(student);
        payment.setOperator(operator);
        
        if (student.getParent() != null) {
            payment.setParent(student.getParent());
        } else {
            System.out.println("Warning: Student " + studentId + " has no parent assigned. Payment will be created without parent reference.");
        }
        
        if (student.getAssignedShuttle() != null) {
            payment.setShuttle(student.getAssignedShuttle());
        } else {
            System.out.println("Warning: Student " + studentId + " has no assigned shuttle. Payment will be created without shuttle reference.");
        }

        payment.setAmount(amount);
        payment.setDueDate(dueDate);
        payment.setPaymentType(paymentType);
        payment.setBillingMonth(billingMonth);
        payment.setPaymentPlan(paymentPlan);
        updatePaymentStatus(payment, PaymentStatus.PENDING);

        System.out.println("Saving payment record...");
        return paymentRepository.save(payment);
    }

    public Payment createPayment(Payment payment) {
        if (payment.getPaymentStatus() == null) updatePaymentStatus(payment, PaymentStatus.PENDING);
        return paymentRepository.save(payment);
    }

    public List<Payment> getPaymentsByParent(Long parentId) {
        checkOverduePayments();
        return paymentRepository.findByParent_ParentId(parentId);
    }

    public List<Payment> getPaymentsByOperator(Long operatorId) {
        checkOverduePayments();
        return paymentRepository.findByOperator_OperatorId(operatorId);
    }

    public Payment processPayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId).orElseThrow(() -> new RuntimeException("Payment not found"));
        updatePaymentStatus(payment, PaymentStatus.PAID);
        payment.setTransactionDate(LocalDateTime.now());
        payment.setPaymentMethod("GCASH");
        return paymentRepository.save(payment);
    }

    private void updatePaymentStatus(Payment payment, PaymentStatus newStatus) {
        payment.setPaymentStatus(newStatus);
        switch (newStatus) {
            case PENDING -> payment.setStatus(0);
            case PAID -> payment.setStatus(1);
            case OVERDUE -> payment.setStatus(2);
        }
    }

    private void checkOverduePayments() {
        List<Payment> pendingPayments = paymentRepository.findAll().stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.PENDING)
                .toList();
 
        LocalDateTime now = LocalDateTime.now();
        for (Payment payment : pendingPayments) {
            if (payment.getDueDate() != null && payment.getDueDate().isBefore(now)) {
                updatePaymentStatus(payment, PaymentStatus.OVERDUE);
                paymentRepository.save(payment);
            }
        }
    }
}
