package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.*;
import com.example.shuttlemonitor.Repository.*;
import com.example.shuttlemonitor.exception.UnauthorizedAccessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable; // Added import
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

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
    private ShuttleRepository shuttleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public ResponseEntity<String> createUser(User user) {
        if (userRepository.findByUsernameOrEmail(user.getUsername(), user.getEmail()).isPresent()) {
            return new ResponseEntity<>("Username or email already exists", HttpStatus.CONFLICT);
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(user);
        // If role not ADMIN, create corresponding entity with default fields
        if (user.getRole() != Role.ADMIN) {
            switch (user.getRole()) {
                case PARENT:
                    Parent parent = new Parent();
                    parent.setUser(user);
                    parentRepository.save(parent);
                    break;
                case STUDENT:
                    Student student = new Student();
                    student.setUser(user);
                    studentRepository.save(student);
                    break;
                case OPERATOR:
                    Operator operator = new Operator();
                    operator.setUser(user);
                    operatorRepository.save(operator);
                    break;
                case DRIVER:
                    Driver driver = new Driver();
                    driver.setUser(user);
                    driverRepository.save(driver);
                    break;
            }
        }
        return new ResponseEntity<>("User created successfully", HttpStatus.CREATED);
    }

    public ResponseEntity<User> getUserWithDetails(Long userId) {
        return userRepository.findById(userId)
                .map(user -> new ResponseEntity<>(user, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }

    public ResponseEntity<String> deleteUser(Long userId) {
        String currentUsername = ((UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUsername();
        User currentUser = userRepository.findByUsername(currentUsername);
        if (currentUser != null && currentUser.getUserId().equals(userId)) {
            return new ResponseEntity<>("Cannot delete own account", HttpStatus.FORBIDDEN);
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
        }

        // Delete role-specific entity first
        switch (user.getRole()) {
            case PARENT:
                Parent parent = parentRepository.findByUser(user).orElse(null);
                if (parent != null) parentRepository.delete(parent);
                break;
            case STUDENT:
                Student student = studentRepository.findByUser(user).orElse(null);
                if (student != null) studentRepository.delete(student);
                break;
            case OPERATOR:
                Operator operator = operatorRepository.findByUser(user).orElse(null);
                if (operator != null) operatorRepository.delete(operator);
                break;
            case DRIVER:
                Driver driver = driverRepository.findByUser(user).orElse(null);
                if (driver != null) driverRepository.delete(driver);
                break;
            default:
                // For ADMIN, no additional
                break;
        }

        userRepository.deleteById(userId);
        return new ResponseEntity<>("User deleted successfully", HttpStatus.OK);
    }

    public Page<User> getAllUsers(int page, int size, String sortBy, String sortOrder) {
        String sortField;
        switch (sortBy.toLowerCase()) {
            case "username":
                sortField = "username";
                break;
            case "email":
                sortField = "email";
                break;
            case "createdat":
            case "date":
                sortField = "createdAt";
                break;
            default:
                sortField = "createdAt"; // Default sort
        }

        Sort sort = Sort.by(sortOrder.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sortField);
        Pageable pageable = PageRequest.of(page, size, sort);
        return userRepository.findAll(pageable);
    }

    public User getCurrentUser() {
        String username = ((UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getUsername();
        return userRepository.findByUsername(username);
    }

    public Parent getCurrentParent() {
        User current = getCurrentUser();
        if (current.getRole() != Role.PARENT) return null;
        return parentRepository.findByUser(current).orElseThrow(() -> new IllegalArgumentException("Parent not found for user"));
    }

    public Student getCurrentStudent() {
        User current = getCurrentUser();
        if (current.getRole() != Role.STUDENT) return null;
        return studentRepository.findByUser(current).orElseThrow(() -> new IllegalArgumentException("Student not found for user"));
    }

    public Operator getCurrentOperator() {
        User current = getCurrentUser();
        if (current.getRole() != Role.OPERATOR) return null;
        return operatorRepository.findByUser(current).orElseThrow(() -> new IllegalArgumentException("Operator not found for user"));
    }

    public Driver getCurrentDriver() {
        User current = getCurrentUser();
        if (current.getRole() != Role.DRIVER) return null;
        return driverRepository.findByUser(current).orElseThrow(() -> new IllegalArgumentException("Driver not found for user"));
    }

    public boolean isOwnerOrAdminForParent(Long parentId) {
        User currentUser = getCurrentUser();
        if (currentUser.getRole() == Role.ADMIN) return true;
        Parent target = parentRepository.findById(parentId).orElse(null);
        if (target == null) return false;
        return target.getUser().getUserId().equals(currentUser.getUserId());
    }

    public boolean isOwnerOrAdminForOperator(Long operatorId) {
        User currentUser = getCurrentUser();
        if (currentUser.getRole() == Role.ADMIN) return true;
        Operator target = operatorRepository.findById(operatorId).orElse(null);
        if (target == null) return false;
        return target.getUser().getUserId().equals(currentUser.getUserId());
    }

    public boolean isOwnerOrAdminOrParentForStudent(Long studentId) {
        User currentUser = getCurrentUser();
        if (currentUser.getRole() == Role.ADMIN) return true;
        Student student = studentRepository.findById(studentId).orElse(null);
        if (student == null) return false;
        if (currentUser.getRole() == Role.STUDENT && student.getUser().getUserId().equals(currentUser.getUserId())) return true;
        if (currentUser.getRole() == Role.PARENT) {
            Parent currentParent = getCurrentParent();
            if (currentParent != null && student.getParent() != null && student.getParent().getParentId().equals(currentParent.getParentId())) return true;
        }
        return false;
    }

    public boolean isOwnerOrAdminOrOperatorForDriver(Long driverId) {
        User currentUser = getCurrentUser();
        if (currentUser.getRole() == Role.ADMIN) return true;
        Driver driver = driverRepository.findById(driverId).orElse(null);
        if (driver == null) return false;
        if (currentUser.getRole() == Role.DRIVER && driver.getUser().getUserId().equals(currentUser.getUserId())) return true;
        if (currentUser.getRole() == Role.OPERATOR) {
            Operator currentOperator = getCurrentOperator();
            if (currentOperator != null && driver.getOperator() != null && driver.getOperator().getOperatorId().equals(currentOperator.getOperatorId())) return true;
        }
        return false;
    }

    public void checkAccessForStudent(Student student) {
        if (!isOwnerOrAdminOrParentForStudent(student.getStudentId())) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
    }

    public void checkAccessForParent(Parent parent) {
        if (!isOwnerOrAdminForParent(parent.getParentId())) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
    }

    public void checkAccessForOperator(Operator operator) {
        if (!isOwnerOrAdminForOperator(operator.getOperatorId())) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
    }

    public void checkAccessForDriver(Driver driver) {
        if (!isOwnerOrAdminOrOperatorForDriver(driver.getDriverId())) {
            throw new UnauthorizedAccessException("Unauthorized");
        }
    }
    public Student assignShuttleToStudent(Long studentId, Long shuttleId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        checkAccessForStudent(student);  // Existing access check

        Shuttle shuttle = shuttleRepository.findById(shuttleId)
                .orElseThrow(() -> new IllegalArgumentException("Shuttle not found"));

        student.setAssignedShuttle(shuttle);
        return studentRepository.save(student);
    }
}