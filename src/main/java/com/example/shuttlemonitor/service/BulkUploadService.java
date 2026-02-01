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
    public Map<String, Object> processBulkParentsStudents(MultipartFile file) throws IOException {
        return processSpecificSheet(file, "ParentsStudents", this::processParentStudentSheet);
    }

    @Transactional
    public Map<String, Object> processBulkOperatorsDrivers(MultipartFile file) throws IOException {
        return processSpecificSheet(file, "OperatorsDrivers", this::processOperatorDriverSheet);
    }

    private Map<String, Object> processSpecificSheet(MultipartFile file, String sheetName, SheetProcessor processor) throws IOException {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        List<String> successes = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            System.out.println("Available sheets for " + sheetName + ": ");
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                System.out.println("Sheet " + i + ": '" + workbook.getSheetName(i) + "'");
            }

            Sheet sheet = workbook.getSheet(sheetName);
            if (sheet != null) {
                processor.process(sheet, successes, errors);
            } else {
                errors.add("Sheet '" + sheetName + "' not found in Excel file");
            }
        }

        result.put("successes", successes);
        result.put("errors", errors);
        result.put("successfulCount", successes.size());
        result.put("errorCount", errors.size());
        result.put("totalProcessed", successes.size() + errors.size());
        return result;
    }

    @FunctionalInterface
    private interface SheetProcessor {
        void process(Sheet sheet, List<String> successes, List<String> errors);
    }

    private void processParentStudentSheet(Sheet sheet, List<String> successes, List<String> errors) {
        for (int i = 1; i <= sheet.getLastRowNum(); i++) { // Start from row 1 (Excel Row 2, skip header)
            Row row = sheet.getRow(i);
            if (row == null || isEmptyRow(row)) continue;

            int excelRowNum = i + 1; // 1-based for user-friendly errors
            try {
                BulkParentStudentDTO dto = parseParentStudentRow(row);
                if (dto != null) { // Allow parents without students
                    createParentWithStudents(dto, successes, errors, excelRowNum);
                } else {
                    errors.add("Row " + excelRowNum + ": No valid data found");
                }
            } catch (Exception e) {
                errors.add("Row " + excelRowNum + ": " + e.getMessage());
            }
        }
    }

    private void processOperatorDriverSheet(Sheet sheet, List<String> successes, List<String> errors) {
        for (int i = 1; i <= sheet.getLastRowNum(); i++) { // Start from row 1 (Excel Row 2)
            Row row = sheet.getRow(i);
            if (row == null || isEmptyRow(row)) continue;

            int excelRowNum = i + 1;
            try {
                BulkOperatorDriverDTO dto = parseOperatorDriverRow(row);
                if (dto != null) { // Allow operators without drivers
                    createOperatorWithDrivers(dto, successes, errors, excelRowNum);
                } else {
                    errors.add("Row " + excelRowNum + ": No valid data found");
                }
            } catch (Exception e) {
                errors.add("Row " + excelRowNum + ": " + e.getMessage());
            }
        }
    }

    private boolean isEmptyRow(Row row) {
        if (row == null) return true;
        for (int j = 0; j < 6; j++) { // Check first 6 columns for parents/operators
            Cell cell = row.getCell(j);
            if (cell != null && getCellValueAsString(cell) != null && !getCellValueAsString(cell).trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private BulkParentStudentDTO parseParentStudentRow(Row row) {
        // Column indices (0-based): 0: parentUsername, 1: parentEmail, 2: parentPassword, 3: parentFullName, 4: parentContactPhone, 5: parentCurrentAddress
        // Students: baseCol 6 + (s * 8)

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
        for (int s = 0; s < 5; s++) {
            int baseCol = 6 + (s * 8);
            String studentUsername = getCellValueAsString(row.getCell(baseCol));
            if (studentUsername == null || studentUsername.trim().isEmpty()) continue;

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

            if (studentPassword == null || studentPassword.trim().isEmpty() || studentPassword.length() < 6) {
                throw new IllegalArgumentException("Invalid or missing password for student " + (s + 1));
            }

            if (studentFullName == null || studentFullName.trim().isEmpty()) {
                throw new IllegalArgumentException("Missing full name for student " + (s + 1));
            }

            if (studentGrade == null || studentGrade.trim().isEmpty() || studentSection == null || studentSection.trim().isEmpty()) {
                throw new IllegalArgumentException("Missing grade or section for student " + (s + 1));
            }

            students.add(new BulkStudentDTO(studentUsername, studentEmail, studentPassword, studentFullName,
                    studentContactPhone, studentCurrentAddress, studentGrade, studentSection));
        }

        return new BulkParentStudentDTO(parentUsername, parentEmail, parentPassword, parentFullName,
                parentContactPhone, parentCurrentAddress, students);
    }

    private BulkOperatorDriverDTO parseOperatorDriverRow(Row row) {
        // Column indices: 0: operatorUsername, 1: operatorEmail, 2: operatorPassword, 3: operatorFullName, 4: operatorContactPhone
        // Drivers: baseCol 5 + (d * 6)

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
        for (int d = 0; d < 5; d++) {
            int baseCol = 5 + (d * 6);
            String driverUsername = getCellValueAsString(row.getCell(baseCol));
            if (driverUsername == null || driverUsername.trim().isEmpty()) continue;

            String driverEmail = getCellValueAsString(row.getCell(baseCol + 1));
            String driverPassword = getCellValueAsString(row.getCell(baseCol + 2));
            String driverContactPhone = getCellValueAsString(row.getCell(baseCol + 4));
            String driverEmergencyContact = getCellValueAsString(row.getCell(baseCol + 5));

            if (driverEmail == null || driverEmail.trim().isEmpty() || !EMAIL_PATTERN.matcher(driverEmail).matches()) {
                throw new IllegalArgumentException("Invalid or missing email for driver " + (d + 1) + ": " + driverEmail);
            }

            if (driverPassword == null || driverPassword.trim().isEmpty() || driverPassword.length() < 6) {
                throw new IllegalArgumentException("Invalid or missing password for driver " + (d + 1));
            }

            drivers.add(new BulkDriverDTO(driverUsername, driverEmail, driverPassword,
                    driverContactPhone, driverEmergencyContact));
        }

        return new BulkOperatorDriverDTO(operatorUsername, operatorEmail, operatorPassword, operatorFullName,
                operatorContactPhone, drivers);
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getDateCellValue().toString();
                } else {
                    // Force numeric to string for phones/IDs (e.g., 6374123456 -> "6374123456")
                    double numericValue = cell.getNumericCellValue();
                    if (numericValue == (long) numericValue) {
                        yield String.valueOf((long) numericValue);
                    } else {
                        yield String.valueOf(numericValue);
                    }
                }
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }

    private void createParentWithStudents(BulkParentStudentDTO dto, List<String> successes, List<String> errors, int rowNum) {
        Parent parent = null;
        boolean parentCreated = false;

        // Check for existing parent user
        User existingParentUser = userRepository.findByUsername(dto.parentUsername());
        if (existingParentUser == null) {
            existingParentUser = userRepository.findByEmail(dto.parentEmail()).orElse(null);
        }

        if (existingParentUser != null) {
            if (existingParentUser.getRole() != Role.PARENT) {
                errors.add("Row " + rowNum + ": Username '" + dto.parentUsername() + "' exists but is not a parent (skipped)");
                return;
            }
            parent = parentRepository.findByUser(existingParentUser).orElse(null);
        }

        try {
            if (parent == null) {
                User parentUser;
                if (existingParentUser != null) {
                    parentUser = existingParentUser;
                } else {
                    // Create parent user
                    parentUser = new User();
                    parentUser.setUsername(dto.parentUsername());
                    parentUser.setEmail(dto.parentEmail());
                    parentUser.setPassword(passwordEncoder.encode(dto.parentPassword()));
                    parentUser.setRole(Role.PARENT);
                    parentUser = userRepository.save(parentUser);
                }

                // Create parent entity
                parent = new Parent();
                parent.setUser(parentUser);
                parent.setFullName(dto.parentFullName());
                parent.setContactPhone(dto.parentContactPhone());
                parent.setCurrentAddress(dto.parentCurrentAddress());
                parent = parentRepository.save(parent);
                parentCreated = true;
            }

            int createdStudents = 0;
            // Create students and link to parent
            for (BulkStudentDTO studentDto : dto.students()) {
                // Check duplicate for student
                if (userRepository.findByEmail(studentDto.email()).isPresent() || userRepository.findByUsername(studentDto.username()) != null) {
                    errors.add("Row " + rowNum + ": Student '" + studentDto.username() + "' already exists (skipped)");
                    continue;
                }

                User studentUser = new User();
                studentUser.setUsername(studentDto.username());
                studentUser.setEmail(studentDto.email());
                studentUser.setPassword(passwordEncoder.encode(studentDto.password()));
                studentUser.setRole(Role.STUDENT);
                studentUser = userRepository.save(studentUser);

                Student student = new Student();
                student.setUser(studentUser);
                student.setFullName(studentDto.fullName());
                student.setContactPhone(studentDto.contactPhone());
                student.setCurrentAddress(studentDto.currentAddress());
                student.setGrade(studentDto.grade());
                student.setSection(studentDto.section());
                student.setParent(parent);
                studentRepository.save(student);
                createdStudents++;
            }

            String action = (parentCreated || createdStudents > 0) ? "Processed" : "Checked";
            successes.add("Row " + rowNum + ": " + action + " parent '" + dto.parentUsername() + "' with " + createdStudents + " new students");
        } catch (Exception e) {
            errors.add("Row " + rowNum + ": Failed to process parent '" + dto.parentUsername() + "': " + e.getMessage());
        }
    }

    private void createOperatorWithDrivers(BulkOperatorDriverDTO dto, List<String> successes, List<String> errors, int rowNum) {
        Operator operator = null;
        boolean operatorCreated = false;

        // Check for existing operator user
        User existingOperatorUser = userRepository.findByUsername(dto.operatorUsername());
        if (existingOperatorUser == null) {
            existingOperatorUser = userRepository.findByEmail(dto.operatorEmail()).orElse(null);
        }

        if (existingOperatorUser != null) {
            if (existingOperatorUser.getRole() != Role.OPERATOR) {
                errors.add("Row " + rowNum + ": Username '" + dto.operatorUsername() + "' exists but is not an operator (skipped)");
                return;
            }
            operator = operatorRepository.findByUser(existingOperatorUser).orElse(null);
        }

        try {
            if (operator == null) {
                User operatorUser;
                if (existingOperatorUser != null) {
                    operatorUser = existingOperatorUser;
                } else {
                    // Create operator user
                    operatorUser = new User();
                    operatorUser.setUsername(dto.operatorUsername());
                    operatorUser.setEmail(dto.operatorEmail());
                    operatorUser.setPassword(passwordEncoder.encode(dto.operatorPassword()));
                    operatorUser.setRole(Role.OPERATOR);
                    operatorUser = userRepository.save(operatorUser);
                }

                // Create operator entity
                operator = new Operator();
                operator.setUser(operatorUser);
                operator.setFullName(dto.operatorFullName());
                operator.setContactPhone(dto.operatorContactPhone());
                operator = operatorRepository.save(operator);
                operatorCreated = true;
            }

            int createdDrivers = 0;
            // Create drivers and link to operator
            for (BulkDriverDTO driverDto : dto.drivers()) {
                // Check duplicate for driver
                if (userRepository.findByEmail(driverDto.email()).isPresent() || userRepository.findByUsername(driverDto.username()) != null) {
                    errors.add("Row " + rowNum + ": Driver '" + driverDto.username() + "' already exists (skipped)");
                    continue;
                }

                User driverUser = new User();
                driverUser.setUsername(driverDto.username());
                driverUser.setEmail(driverDto.email());
                driverUser.setPassword(passwordEncoder.encode(driverDto.password()));
                driverUser.setRole(Role.DRIVER);
                driverUser = userRepository.save(driverUser);

                Driver driver = new Driver();
                driver.setUser(driverUser);
                driver.setContactPhone(driverDto.contactPhone());
                driver.setEmergencyContact(driverDto.emergencyContact());
                driver.setOperator(operator);
                driverRepository.save(driver);
                createdDrivers++;
            }

            String action = (operatorCreated || createdDrivers > 0) ? "Processed" : "Checked";
            successes.add("Row " + rowNum + ": " + action + " operator '" + dto.operatorUsername() + "' with " + createdDrivers + " new drivers");
        } catch (Exception e) {
            errors.add("Row " + rowNum + ": Failed to process operator '" + dto.operatorUsername() + "': " + e.getMessage());
        }
    }

    public byte[] generateParentStudentTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("ParentsStudents");

            // Headers
            Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "Parent Username", "Parent Email", "Parent Password", "Parent Full Name", "Parent Contact", "Parent Address",
                    "Student 1 Username", "Student 1 Email", "Student 1 Password", "Student 1 Name", "Student 1 Contact", "Student 1 Address", "Student 1 Grade", "Student 1 Section",
                    "Student 2 Username", "Student 2 Email", "Student 2 Password", "Student 2 Name", "Student 2 Contact", "Student 2 Address", "Student 2 Grade", "Student 2 Section"
                    // ... intended for up to 5, but let's just show 2 slots for brevity in template
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                sheet.setColumnWidth(i, 5000);
            }

            // Example Data Row
            Row exampleRow = sheet.createRow(1);
            exampleRow.createCell(0).setCellValue("parent_juan");
            exampleRow.createCell(1).setCellValue("juan@example.com");
            exampleRow.createCell(2).setCellValue("password123");
            exampleRow.createCell(3).setCellValue("Juan Dela Cruz");
            exampleRow.createCell(4).setCellValue("09123456789");
            exampleRow.createCell(5).setCellValue("Naga City");
            exampleRow.createCell(6).setCellValue("stud_maria");
            exampleRow.createCell(7).setCellValue("maria@example.com");
            exampleRow.createCell(8).setCellValue("password123");
            exampleRow.createCell(9).setCellValue("Maria Dela Cruz");
            exampleRow.createCell(10).setCellValue("09987654321");
            exampleRow.createCell(11).setCellValue("Naga City");
            exampleRow.createCell(12).setCellValue("Grade 10");
            exampleRow.createCell(13).setCellValue("Section A");

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generateOperatorDriverTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("OperatorsDrivers");

            // Headers
            Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "Operator Username", "Operator Email", "Operator Password", "Operator Full Name", "Operator Contact",
                    "Driver 1 Username", "Driver 1 Email", "Driver 1 Password", "Driver 1 Name", "Driver 1 Contact", "Driver 1 Emergency"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                sheet.setColumnWidth(i, 5000);
            }

            // Example Data Row
            Row exampleRow = sheet.createRow(1);
            exampleRow.createCell(0).setCellValue("op_agency");
            exampleRow.createCell(1).setCellValue("agency@example.com");
            exampleRow.createCell(2).setCellValue("password123");
            exampleRow.createCell(3).setCellValue("Transit Agency");
            exampleRow.createCell(4).setCellValue("09123456789");
            exampleRow.createCell(5).setCellValue("driver_pedro");
            exampleRow.createCell(6).setCellValue("pedro@example.com");
            exampleRow.createCell(7).setCellValue("password123");
            exampleRow.createCell(8).setCellValue("Pedro Driver");
            exampleRow.createCell(9).setCellValue("09987654321");
            exampleRow.createCell(10).setCellValue("09112223333");

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }
}