package com.example.shuttlemonitor.util;

public record ChangePassword(String currentPassword, String newPassword, String repeatPassword) {
}