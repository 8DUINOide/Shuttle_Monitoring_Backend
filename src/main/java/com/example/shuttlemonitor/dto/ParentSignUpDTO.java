package com.example.shuttlemonitor.dto;

import java.util.List;

public record ParentSignUpDTO(UserSignUpDTO parent, List<UserSignUpDTO> students) {
}