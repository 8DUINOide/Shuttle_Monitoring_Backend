package com.example.shuttlemonitor.config;

import com.example.shuttlemonitor.exception.UnauthorizedAccessException;
import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Hidden
@ControllerAdvice
public class GlobalExceptionHandler {

    // Helper method to create consistent error responses
    private ResponseEntity<Map<String, Object>> buildErrorResponse(String errorType, String message, HttpStatus status) {
        Map<String, Object> response = new HashMap<>();
        response.put("error", errorType);
        response.put("message", message);
        response.put("status", status.value());
        return new ResponseEntity<>(response, status);
    }

    // 400 - Bad Request (e.g., invalid input)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        return buildErrorResponse(
                "Invalid Request",
                "Something in your request doesn't look right. Please check and try again.",
                HttpStatus.BAD_REQUEST
        );
    }

    // 401 - Unauthorized (not logged in or invalid token)
    @ExceptionHandler({org.springframework.security.core.AuthenticationException.class})
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(Exception ex) {
        return buildErrorResponse(
                "Please Sign In",
                "You need to log in to access this feature. Please sign in and try again.",
                HttpStatus.UNAUTHORIZED
        );
    }

    // 403 - Forbidden (logged in but no permission)
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDeniedException(AccessDeniedException ex) {
        return buildErrorResponse(
                "Access Denied",
                "Sorry, you don't have permission to do this. Contact support if you think this is a mistake.",
                HttpStatus.FORBIDDEN
        );
    }

    // Custom unauthorized access (from your UserService checks)
    @ExceptionHandler(UnauthorizedAccessException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorizedAccessException(UnauthorizedAccessException ex) {
        return buildErrorResponse(
                "Access Denied",
                "Sorry, you don't have permission to view or change this information.",
                HttpStatus.FORBIDDEN
        );
    }

    // 401 - User not found (during login or password reset)
    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUsernameNotFoundException(UsernameNotFoundException ex) {
        return buildErrorResponse(
                "Account Not Found",
                "We couldn't find an account with that username or email. Please check and try again.",
                HttpStatus.UNAUTHORIZED
        );
    }

    // 500 - File upload issues
    @ExceptionHandler(IOException.class)
    public ResponseEntity<Map<String, Object>> handleIOException(IOException ex) {
        return buildErrorResponse(
                "Upload Error",
                "We had trouble uploading your file. Please try again or use a smaller file.",
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }

    // Catch-all for unexpected errors (500)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        // In production, you might want to log ex.getMessage() here
        return buildErrorResponse(
                "Something Went Wrong",
                "We're having a technical issue right now. Please try again later or contact support.",
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}