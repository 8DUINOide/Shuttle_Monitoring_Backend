package com.example.shuttlemonitor.dto;

import java.util.List;

public record OperatorSignUpDTO(UserSignUpDTO operator, List<UserSignUpDTO> drivers) {
}