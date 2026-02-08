package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Payment;
import com.example.shuttlemonitor.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @GetMapping
    public ResponseEntity<?> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }

    @PostMapping
    public ResponseEntity<?> createPayment(@RequestBody Map<String, Object> request) {
        System.out.println("Received createPayment request: " + request);
        try {
            Long studentId = Long.valueOf(request.get("studentId").toString());
            Long operatorId = Long.valueOf(request.get("operatorId").toString());
            Double amount = Double.valueOf(request.get("amount").toString());
            LocalDateTime dueDate = LocalDateTime.parse(request.get("dueDate").toString());
            String paymentType = request.get("paymentType").toString();
            String billingMonth = request.get("billingMonth") != null ? request.get("billingMonth").toString() : "";
            String paymentPlan = request.get("paymentPlan") != null ? request.get("paymentPlan").toString() : "";

            return ResponseEntity.ok(paymentService.createPayment(studentId, operatorId, amount, dueDate, paymentType, billingMonth, paymentPlan));
        } catch (Exception e) {
            System.err.println("Error creating payment: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Error: " + e.getMessage()));
        }
    }

    @GetMapping("/parent/{parentId}")
    public ResponseEntity<?> getPaymentsByParent(@PathVariable Long parentId) {
        return ResponseEntity.ok(paymentService.getPaymentsByParent(parentId));
    }

    @GetMapping("/operator/{operatorId}")
    public ResponseEntity<?> getPaymentsByOperator(@PathVariable Long operatorId) {
        return ResponseEntity.ok(paymentService.getPaymentsByOperator(operatorId));
    }

    @PostMapping("/{paymentId}/pay")
    public ResponseEntity<?> processPayment(@PathVariable Long paymentId) {
        try {
            return ResponseEntity.ok(paymentService.processPayment(paymentId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
