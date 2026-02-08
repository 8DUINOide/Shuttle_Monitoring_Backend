package com.example.shuttlemonitor.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "payments")
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Long paymentId;

    @Column(name = "amount", nullable = false)
    private Double amount;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "status")
    private Integer status = 0; // Default status integer

    @ManyToOne
    @JoinColumn(name = "shuttle_id")
    private Shuttle shuttle;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Parent parent;

    @ManyToOne
    @JoinColumn(name = "operator_id")
    private Operator operator;

    @Column(name = "payment_type")
    private String paymentType; // e.g., "MONTHLY", "DAILY"

    @Column(name = "billing_month")
    private String billingMonth;

    @Column(name = "payment_plan")
    private String paymentPlan;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (paymentStatus == null) paymentStatus = PaymentStatus.PENDING;
        if (status == null) status = 0;
    }
}
