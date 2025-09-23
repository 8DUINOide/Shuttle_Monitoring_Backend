package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.UserRepository;
import com.example.shuttlemonitor.config.JwtUtil;
import com.example.shuttlemonitor.service.LoginService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private LoginService loginService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/auth/sign-in")
    public ResponseEntity<?> signIn(@RequestBody Map<String, String> credentials) {
        String usernameOrEmail = credentials.get("usernameOrEmail");
        String password = credentials.get("password");

        Map<String, Object> response = new HashMap<>();
        if (usernameOrEmail == null || usernameOrEmail.isEmpty() || password == null || password.isEmpty()) {
            response.put("error", "Username or email and password are required");
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }

        User user = userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .orElse(null);
        if (user == null || !encoder.matches(password, user.getPassword())) {
            response.put("error", "Invalid credentials");
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }

        UserDetails userDetails = loginService.loadUserByUsername(user.getUsername());
        String accessToken = jwtUtil.generateToken(userDetails);
        String refreshToken = jwtUtil.generateRefreshToken(userDetails);
        return ResponseEntity.ok(Map.of(
                "access_token", accessToken,
                "refresh_token", refreshToken,
                "user_id", user.getUserId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "status", "success"
        ));
    }

    @PostMapping("/auth/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> tokenRequest) {
        String refreshToken = tokenRequest.get("refresh_token");
        Map<String, Object> response = new HashMap<>();
        if (refreshToken == null || refreshToken.isEmpty()) {
            response.put("error", "Refresh token is required");
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }

        if (jwtUtil.validateRefreshToken(refreshToken)) {
            String username = jwtUtil.getUsernameFromToken(refreshToken);
            User user = userRepository.findByUsername(username)
                    .orElse(null); // Updated to handle Optional<User>
            if (user != null) {
                UserDetails userDetails = loginService.loadUserByUsername(username);
                String newAccessToken = jwtUtil.generateToken(userDetails);
                return ResponseEntity.ok(Map.of(
                        "access_token", newAccessToken,
                        "refresh_token", refreshToken,
                        "user_id", user.getUserId(),
                        "status", "success"
                ));
            }
        }
        response.put("error", "Invalid refresh token");
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }
}
