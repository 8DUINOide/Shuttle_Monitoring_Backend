package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.*;
import com.example.shuttlemonitor.Repository.*;
import com.example.shuttlemonitor.dto.BulkDriverDTO;
import com.example.shuttlemonitor.dto.BulkOperatorDriverDTO;
import com.example.shuttlemonitor.dto.BulkParentStudentDTO;
import com.example.shuttlemonitor.dto.BulkStudentDTO;
import com.example.shuttlemonitor.exception.UnauthorizedAccessException;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class BulkUploadService {

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
    private PasswordEncoder passwordEncoder;

    // Email validation pattern
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})$");

    @Transactional
    public Map<String, Object> processBulkUpload(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        List<String> successes = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            // Process Parents/Students Sheet
            Sheet parentSheet = workbook.getSheet("ParentsStudents");
            if (parentSheet != null) {
                processParentStudentSheet(parentSheet, successes, errors);
            } else {
                errors.add("Sheet 'ParentsStudents' not found in Excel file");
            }

            // Process Operators/Drivers Sheet
            Sheet operatorSheet = workbook.getSheet("OperatorsDrivers");
            if (operatorSheet != null) {
                processOperatorDriverSheet(operatorSheet, successes, errors);
            } else {
                errors.add("Sheet 'OperatorsDrivers' not found in Excel file");
            }

        }

        result.put("successes", successes);
        result.put("errors", errors);
        result.put("totalProcessed", successes.size() + errors.size());
        return result;
    }

    private void processParentStudentSheet(Sheet sheet, List<String> successes, List<String> errors) {
        for (int i = 1; i <= sheet.getLastRowNum(); i++) { // Start from row 1 (skip header)
            Row row = sheet.getRow(i);
            if (row == null) continue;

            try {
                BulkParentStudentDTO dto = parseParentStudentRow(row);
                if (dto != null) { // dto could be null if row is empty/invalid
                    createParentWithStudents(dto, successes);
                }
            } catch (Exception e) {
                errors.add("Row " + (i + 1) + ": " + e.getMessage());
            }
        }
    }

    private void processOperatorDriverSheet(Sheet sheet, List<String> successes, List<String> errors) {
        for (int i = 1; i <= sheet.getLastRowNum(); i++) { // Start from row 1 (skip header)
            Row row = sheet.getRow(i);
            if (row == null) continue;

            try {
                BulkOperatorDriverDTO dto = parseOperatorDriverRow(row);
                if (dto != null) {
                    createOperatorWithDrivers(dto, successes);
                }
            } catch (Exception e) {
                errors.add("Row " + (i + 1) + ": " + e.getMessage());
            }
        }
    }

    private BulkParentStudentDTO parseParentStudentRow(Row row) {
        // Column indices (0-based): Adjust based on your Excel template
        // 0: parentUsername, 1: parentEmail, 2: parentPassword, 3: parentFullName, 4: parentContactPhone, 5: parentCurrentAddress
        // Then students start at column 6: student1_username (6), student1_email (7), ..., up to 5 students (columns 6-45)

        String parentUsername = getCellValueAsString(row.getCell(0));
        String parentEmail = getCellValueAsString(row.getCell(1));
        String parentPassword = getCellValueAsString(row.getCell(2));
        String parentFullName = getCellValueAsString(row.getCell(3));
        String parentContactPhone = getCellValueAsString(row.getCell(4));
        String parentCurrentAddress = getCellValueAsString(row.getCell(5));

        // Validate required fields
        if (parentUsername == null || parentUsername.trim().isEmpty() ||
                parentEmail == null || parentEmail.trim().isEmpty() ||
                parentPassword == null || parentPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required fields for parent (username, email, password)");
        }

        if (!EMAIL_PATTERN.matcher(parentEmail).matches()) {
            throw new IllegalArgumentException("Invalid email format for parent: " + parentEmail);
        }

        if (parentPassword.length() < 6) {
            throw new IllegalArgumentException("Parent password must be at least 6 characters");
        }

        List<BulkStudentDTO> students = new ArrayList<>();
        for (int s = 0; s < 5; s++) { // Up to 5 students per parent
            int baseCol = 6 + (s * 8); // Each student: 8 columns (username, email, password, fullName, contactPhone, currentAddress, grade, section)
            String studentUsername = getCellValueAsString(row.getCell(baseCol));
            if (studentUsername == null || studentUsername.trim().isEmpty()) {
                continue; // Skip empty student row
            }

            String studentEmail = getCellValueAsString(row.getCell(baseCol + 1));
            String studentPassword = getCellValueAsString(row.getCell(baseCol + 2));
            String studentFullName = getCellValueAsString(row.getCell(baseCol + 3));
            String studentContactPhone = getCellValueAsString(row.getCell(baseCol + 4));
            String studentCurrentAddress = getCellValueAsString(row.getCell(baseCol + 5));
            String studentGrade = getCellValueAsString(row.getCell(baseCol + 6));
            String studentSection = getCellValueAsString(row.getCell(baseCol + 7));

            if (studentEmail == null || studentEmail.trim().isEmpty() || !EMAIL_PATTERN.matcher(studentEmail).matches()) {
                throw new IllegalArgumentException("Invalid or missing email for student " + (s + 1) + ": " + studentEmail);
            }

            students.add(new BulkStudentDTO(
                    studentUsername, studentEmail, studentPassword, studentFullName,
                    studentContactPhone, studentCurrentAddress, studentGrade, studentSection
            ));
        }

        return new BulkParentStudentDTO(
                parentUsername, parentEmail, parentPassword, parentFullName,
                parentContactPhone, parentCurrentAddress, students
        );
    }

    private BulkOperatorDriverDTO parseOperatorDriverRow(Row row) {
        // Column indices: 0: operatorUsername, 1: operatorEmail, 2: operatorPassword, 3: operatorFullName, 4: operatorContactPhone
        // Then drivers start at column 5: driver1_username (5), driver1_email (6), ..., up to 5 drivers (columns 5-34)

        String operatorUsername = getCellValueAsString(row.getCell(0));
        String operatorEmail = getCellValueAsString(row.getCell(1));
        String operatorPassword = getCellValueAsString(row.getCell(2));
        String operatorFullName = getCellValueAsString(row.getCell(3));
        String operatorContactPhone = getCellValueAsString(row.getCell(4));

        // Validate required fields
        if (operatorUsername == null || operatorUsername.trim().isEmpty() ||
                operatorEmail == null || operatorEmail.trim().isEmpty() ||
                operatorPassword == null || operatorPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("Missing required fields for operator (username, email, password)");
        }

        if (!EMAIL_PATTERN.matcher(operatorEmail).matches()) {
            throw new IllegalArgumentException("Invalid email format for operator: " + operatorEmail);
        }

        if (operatorPassword.length() < 6) {
            throw new IllegalArgumentException("Operator password must be at least 6 characters");
        }

        List<BulkDriverDTO> drivers = new ArrayList<>();
        for (int d = 0; d < 5; d++) { // Up to 5 drivers per operator
            int baseCol = 5 + (d * 6); // Each driver: 6 columns (username, email, password, licenseNumber, contactPhone, emergencyContact)
            String driverUsername = getCellValueAsString(row.getCell(baseCol));
            if (driverUsername == null || driverUsername.trim().isEmpty()) {
                continue; // Skip empty driver row
            }

            String driverEmail = getCellValueAsString(row.getCell(baseCol + 1));
            String driverPassword = getCellValueAsString(row.getCell(baseCol + 2));
            String driverLicenseNumber = getCellValueAsString(row.getCell(baseCol + 3));
            String driverContactPhone = getCellValueAsString(row.getCell(baseCol + 4));
            String driverEmergencyContact = getCellValueAsString(row.getCell(baseCol + 5));

            if (driverEmail == null || driverEmail.trim().isEmpty() || !EMAIL_PATTERN.matcher(driverEmail).matches()) {
                throw new IllegalArgumentException("Invalid or missing email for driver " + (d + 1) + ": " + driverEmail);
            }

            drivers.add(new BulkDriverDTO(
                    driverUsername, driverEmail, driverPassword, driverLicenseNumber,
                    driverContactPhone, driverEmergencyContact
            ));
        }

        return new BulkOperatorDriverDTO(
                operatorUsername, operatorEmail, operatorPassword, operatorFullName,
                operatorContactPhone, drivers
        );
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }

    private void createParentWithStudents(BulkParentStudentDTO dto, List<String> successes) {
        // Check for duplicate email/username for parent
        if (userRepository.findByEmail(dto.parentEmail()).isPresent() || userRepository.findByUsername(dto.parentUsername()) != null) {
            throw new IllegalArgumentException("Duplicate email or username for parent: " + dto.parentUsername());
        }

        // Create parent user
        User parentUser = new User();
        parentUser.setUsername(dto.parentUsername());
        parentUser.setEmail(dto.parentEmail());
        parentUser.setPassword(passwordEncoder.encode(dto.parentPassword()));
        parentUser.setRole(Role.PARENT);
        userRepository.save(parentUser);

        // Create parent entity
        Parent parent = new Parent();
        parent.setUser(parentUser);
        parent.setFullName(dto.parentFullName());
        parent.setContactPhone(dto.parentContactPhone());
        parent.setCurrentAddress(dto.parentCurrentAddress());
        parentRepository.save(parent);

        // Create students and link to parent
        for (BulkStudentDTO studentDto : dto.students()) {
            // Check for duplicate email/username for student
            if (userRepository.findByEmail(studentDto.email()).isPresent() || userRepository.findByUsername(studentDto.username()) != null) {
                throw new IllegalArgumentException("Duplicate email or username for student: " + studentDto.username());
            }

            User studentUser = new User();
            studentUser.setUsername(studentDto.username());
            studentUser.setEmail(studentDto.email());
            studentUser.setPassword(passwordEncoder.encode(studentDto.password()));
            studentUser.setRole(Role.STUDENT);
            userRepository.save(studentUser);

            Student student = new Student();
            student.setUser(studentUser);
            student.setFullName(studentDto.fullName());
            student.setContactPhone(studentDto.contactPhone());
            student.setCurrentAddress(studentDto.currentAddress());
            student.setGrade(studentDto.grade());
            student.setSection(studentDto.section());
            student.setParent(parent);
            studentRepository.save(student);
        }

        successes.add("Created parent '" + dto.parentUsername() + "' with " + dto.students().size() + " students");
    }

    private void createOperatorWithDrivers(BulkOperatorDriverDTO dto, List<String> successes) {
        // Check for duplicate email/username for operator
        if (userRepository.findByEmail(dto.operatorEmail()).isPresent() || userRepository.findByUsername(dto.operatorUsername()) != null) {
            throw new IllegalArgumentException("Duplicate email or username for operator: " + dto.operatorUsername());
        }

        // Create operator user
        User operatorUser = new User();
        operatorUser.setUsername(dto.operatorUsername());
        operatorUser.setEmail(dto.operatorEmail());
        operatorUser.setPassword(passwordEncoder.encode(dto.operatorPassword()));
        operatorUser.setRole(Role.OPERATOR);
        userRepository.save(operatorUser);

        // Create operator entity
        Operator operator = new Operator();
        operator.setUser(operatorUser);
        operator.setFullName(dto.operatorFullName());
        operator.setContactPhone(dto.operatorContactPhone());
        operatorRepository.save(operator);

        // Create drivers and link to operator
        for (BulkDriverDTO driverDto : dto.drivers()) {
            // Check for duplicate email/username for driver
            if (userRepository.findByEmail(driverDto.email()).isPresent() || userRepository.findByUsername(driverDto.username()) != null) {
                throw new IllegalArgumentException("Duplicate email or username for driver: " + driverDto.username());
            }

            User driverUser = new User();
            driverUser.setUsername(driverDto.username());
            driverUser.setEmail(driverDto.email());
            driverUser.setPassword(passwordEncoder.encode(driverDto.password()));
            driverUser.setRole(Role.DRIVER);
            userRepository.save(driverUser);

            Driver driver = new Driver();
            driver.setUser(driverUser);
            driver.setLicenseNumber(driverDto.licenseNumber());
            driver.setContactPhone(driverDto.contactPhone());
            driver.setEmergencyContact(driverDto.emergencyContact());
            driver.setOperator(operator);
            driverRepository.save(driver);
        }

        successes.add("Created operator '" + dto.operatorUsername() + "' with " + dto.drivers().size() + " drivers");
    }
}