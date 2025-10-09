package com.example.shuttlemonitor.dto;

public record BulkStudentDTO(
        String username,
        String email,
        String password,
        String fullName,
        String contactPhone,
        String currentAddress,
        String grade,
        String section
) {}