package com.example.shuttlemonitor.dto;

import java.util.List;

public record BulkOperatorDriverDTO(
        String operatorUsername,
        String operatorEmail,
        String operatorPassword,
        String operatorFullName,
        String operatorContactPhone,
        List<BulkDriverDTO> drivers  // Up to 5 drivers per operator
) {}