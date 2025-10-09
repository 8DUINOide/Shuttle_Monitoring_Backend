package com.example.shuttlemonitor.dto;

import java.util.List;

public record BulkParentStudentDTO(
        String parentUsername,
        String parentEmail,
        String parentPassword,
        String parentFullName,
        String parentContactPhone,
        String parentCurrentAddress,
        List<BulkStudentDTO> students  // Up to 5 students per parent
) {}