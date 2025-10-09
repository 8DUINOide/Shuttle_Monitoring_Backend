package com.example.shuttlemonitor.dto;

public record BulkDriverDTO(
        String username,
        String email,
        String password,
        String licenseNumber,
        String contactPhone,
        String emergencyContact
) {}