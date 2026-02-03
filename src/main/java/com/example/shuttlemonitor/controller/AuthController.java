package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Driver;
import com.example.shuttlemonitor.Entity.Operator;
import com.example.shuttlemonitor.Entity.Parent;
import com.example.shuttlemonitor.Entity.Role;
import com.example.shuttlemonitor.Entity.Student;
import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.DriverRepository;
import com.example.shuttlemonitor.Repository.OperatorRepository;
import com.example.shuttlemonitor.Repository.ParentRepository;
import com.example.shuttlemonitor.Repository.StudentRepository;
import com.example.shuttlemonitor.Repository.UserRepository;
import com.example.shuttlemonitor.config.JwtUtil;
import com.example.shuttlemonitor.dto.OperatorSignUpDTO;
import com.example.shuttlemonitor.dto.ParentSignUpDTO;
import com.example.shuttlemonitor.dto.UserSignUpDTO;
import com.example.shuttlemonitor.service.LoginService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ParentRepository parentRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private OperatorRepository operatorRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private LoginService loginService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/sign-in")
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

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> tokenRequest) {
        String refreshToken = tokenRequest.get("refresh_token");
        Map<String, Object> response = new HashMap<>();
        if (refreshToken == null || refreshToken.isEmpty()) {
            response.put("error", "Refresh token is required");
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }

        if (jwtUtil.validateRefreshToken(refreshToken)) {
            String username = jwtUtil.getUsernameFromToken(refreshToken);
            User user = userRepository.findByUsername(username);
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

    @PostMapping("/sign-up/parents")
    public ResponseEntity<?> signUpParents(@RequestBody ParentSignUpDTO dto) {
        if (!"PARENT".equals(dto.parent().role())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role for parent"));
        }
        for (UserSignUpDTO s : dto.students()) {
            if (!"STUDENT".equals(s.role())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid role for student"));
            }
        }

        if (userRepository.findByUsernameOrEmail(dto.parent().username(), dto.parent().email()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Parent username or email already exists"));
        }

        User parentUser = new User();
        parentUser.setUsername(dto.parent().username());
        parentUser.setEmail(dto.parent().email());
        parentUser.setPassword(encoder.encode(dto.parent().password()));
        parentUser.setRole(Role.valueOf(dto.parent().role()));
        userRepository.save(parentUser);

        Parent parent = new Parent();
        parent.setUser(parentUser);
        parent.setCurrentAddress(dto.parent().currentAddress());
        parent.setFullName(dto.parent().fullName());
        parent.setContactPhone(dto.parent().contactPhone());
        parentRepository.save(parent);

        List<Student> students = new ArrayList<>();
        for (UserSignUpDTO sd : dto.students()) {
            if (userRepository.findByUsernameOrEmail(sd.username(), sd.email()).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Student username or email already exists"));
            }
            User studentUser = new User();
            studentUser.setUsername(sd.username());
            studentUser.setEmail(sd.email());
            studentUser.setPassword(encoder.encode(sd.password()));
            studentUser.setRole(Role.valueOf(sd.role()));
            userRepository.save(studentUser);

            Student student = new Student();
            student.setUser(studentUser);
            student.setCurrentAddress(sd.currentAddress());
            student.setFullName(sd.fullName());
            student.setContactPhone(sd.contactPhone());
            student.setGrade(sd.grade());
            student.setSection(sd.section());
            student.setParent(parent);
            studentRepository.save(student);
            students.add(student);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("parent", parent);
        resp.put("students", students);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/sign-up/operators")
    public ResponseEntity<?> signUpOperators(@RequestBody OperatorSignUpDTO dto) {
        if (!"OPERATOR".equals(dto.operator().role())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role for operator"));
        }
        for (UserSignUpDTO d : dto.drivers()) {
            if (!"DRIVER".equals(d.role())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid role for driver"));
            }
        }

        if (userRepository.findByUsernameOrEmail(dto.operator().username(), dto.operator().email()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Operator username or email already exists"));
        }

        User operatorUser = new User();
        operatorUser.setUsername(dto.operator().username());
        operatorUser.setEmail(dto.operator().email());
        operatorUser.setPassword(encoder.encode(dto.operator().password()));
        operatorUser.setRole(Role.valueOf(dto.operator().role()));
        userRepository.save(operatorUser);

        Operator operator = new Operator();
        operator.setUser(operatorUser);
        operator.setFullName(dto.operator().fullName());
        operator.setContactPhone(dto.operator().contactPhone());
        operatorRepository.save(operator);

        List<Driver> drivers = new ArrayList<>();
        for (UserSignUpDTO dd : dto.drivers()) {
            if (userRepository.findByUsernameOrEmail(dd.username(), dd.email()).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Driver username or email already exists"));
            }
            User driverUser = new User();
            driverUser.setUsername(dd.username());
            driverUser.setEmail(dd.email());
            driverUser.setPassword(encoder.encode(dd.password()));
            driverUser.setRole(Role.valueOf(dd.role()));
            userRepository.save(driverUser);

            Driver driver = new Driver();
            driver.setUser(driverUser);
            driver.setContactPhone(dd.contactPhone());
            driver.setEmergencyContact(dd.emergencyContact());
            driver.setOperator(operator);
            driverRepository.save(driver);
            drivers.add(driver);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("operator", operator);
        resp.put("drivers", drivers);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/sign-up/students")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> setupStudent(@RequestBody Map<String, Object> req) {
        Long studentId = Long.parseLong(req.get("studentId").toString());
        String rfidTag = (String) req.get("rfidTag");
        String fingerprintHash = (String) req.get("fingerprintHash");

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        if (student.getUser().getRole() != Role.STUDENT) {
            throw new IllegalArgumentException("Not a student");
        }

        student.setRfidTag(rfidTag);
        student.setFingerprintHash1(fingerprintHash);
        studentRepository.save(student);

        return ResponseEntity.ok(student);
    }
}