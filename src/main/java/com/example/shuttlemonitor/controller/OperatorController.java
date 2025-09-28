package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Operator;
import com.example.shuttlemonitor.Repository.OperatorRepository;
import com.example.shuttlemonitor.Repository.UserRepository;
import com.example.shuttlemonitor.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/operators")
public class OperatorController {

    @Autowired
    private OperatorRepository operatorRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<Operator> getOperator(@PathVariable Long id) {
        Operator operator = operatorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Operator not found"));
        userService.checkAccessForOperator(operator);
        return ResponseEntity.ok(operator);
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Operator>> getAllOperators(
            @RequestParam(defaultValue = "operatorId") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {
        Sort sort = Sort.by(sortOrder.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sortBy);
        List<Operator> operators = operatorRepository.findAll(sort);
        return ResponseEntity.ok(operators);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@userService.isOwnerOrAdminForOperator(#id)")
    public ResponseEntity<Operator> updateOperator(@PathVariable Long id, @RequestBody Operator updatedOperator) {
        Operator operator = operatorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Operator not found"));
        // Update fields
        operator.setFullName(updatedOperator.getFullName());
        operator.setContactPhone(updatedOperator.getContactPhone());
        // etc.
        operatorRepository.save(operator);
        return ResponseEntity.ok(operator);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteOperator(@PathVariable Long id) {
        Operator operator = operatorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Operator not found"));
        userRepository.delete(operator.getUser());
        operatorRepository.delete(operator);
        return ResponseEntity.ok(Map.of("message", "Operator deleted successfully"));
    }
}