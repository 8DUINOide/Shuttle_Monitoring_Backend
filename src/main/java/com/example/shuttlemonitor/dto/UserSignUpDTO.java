package com.example.shuttlemonitor.dto;

public record UserSignUpDTO(
        String username,
        String email,
        String password,
        String role,
        String currentAddress,
        String fullName,
        String contactPhone,
        String grade,
        String section,
        String emergencyContact
) {}