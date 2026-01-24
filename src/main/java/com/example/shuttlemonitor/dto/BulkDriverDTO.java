package com.example.shuttlemonitor.dto;

public record BulkDriverDTO(
        String username,
        String email,
        String password,
        String contactPhone,
        String emergencyContact
) {}