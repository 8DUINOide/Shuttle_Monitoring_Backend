# Shuttle Monitoring Backend

## Overview

Shuttle Monitoring Backend is a comprehensive backend system for managing school shuttle services. It provides secure multi-role user management, shuttle assignment and tracking, student check-in/out via RFID/fingerprint, real-time occupancy monitoring, and route management. The API implements JWT-based authentication, hierarchical role-based access control (Admin/Parent/Student/Operator/Driver), and an OTP-based password recovery system.

## Features

### Secure Authentication & Authorization

JWT token-based authentication with 5-hour access token and 7-day refresh token validity
Role-based access control (Admin/Parent/Student/Operator/Driver roles)
OTP-based password reset via email
Stateless session management with automatic token refresh


### User Management

Multi-role user creation: Parents linked to multiple Students, Operators linked to multiple Drivers
Admin-only setup for Student RFID tags and fingerprint hashes
User profile management with profile picture upload (up to 500MB)
Password reset workflows for all roles, with admin overrides
Comprehensive user details with hierarchical relationships (e.g., Parent-Student, Operator-Driver)

### Shuttle Management

Create shuttles with assigned Driver, Operator, route, name, and max capacity
Real-time status updates (Active/Inactive) by Drivers/Operators/Admins
Route assignment and updates
Admin-controlled shuttle deletion with automatic unassignment from Students
Occupancy calculation and ETA estimation based on check-ins


### Student Check-In/Out System

RFID tag and fingerprint hash registration for Students (Admin-only)
Check-in/out tracking with success/failure status
Active occupancy counting for shuttles
Next stop prediction based on student locations
Integration support for hardware-based authentication


### Route and Monitoring Analytics

Shuttle route tracking (e.g., "ADNU to Barangay X")
Occupancy percentage calculation with capacity limits
ETA estimation based on occupancy and route progress
Student assignment to shuttles with parent access controls
Check-in history retrieval for reporting
Tech Stack

## Tech Stack

### Backend Framework

Spring Boot 3.4.0 - Core application framework
Java 17 - Programming language
Maven - Dependency management

### Database

PostgreSQL - Relational database for persistent storage
Spring Data JPA - Database abstraction and ORM
Hibernate - JPA implementation

### Security

Spring Security - Authentication and authorization
JWT (JSON Web Tokens) - Token-based authentication
BCrypt - Password encryption

### Email Services

Spring Boot Mail - Email functionality for OTP delivery
Gmail SMTP - Email server integration

### Documentation

Springdoc OpenAPI 2.6.0 - Swagger/OpenAPI documentation
Swagger UI - Interactive API documentation interface

### Additional Libraries

Lombok - Reduce boilerplate code
Jackson - JSON processing
ImageIO - Image processing for profile pictures

## Installation
### Prerequisites

Java Development Kit (JDK) 17 or higher
PostgreSQL 13 or higher
Maven 3.6 or higher
Git


Git: For cloning the repository



Server Access: For deployment (e.g., AWS, DigitalOcean, or local server with public IP)

### Installation

### Clone the Repository
git clone <repository-url>
cd Shuttle Monitoring Backend

### Database Setup

Install and start PostgreSQL
Create a new database:
CREATE DATABASE shuttle_monitor;

## Swagger Documentation
http://127.0.0.1:8080/swagger-ui.html

## API Architecture
### Security Flow

User authenticates via /api/auth/sign-in
Server validates credentials and generates JWT access/refresh tokens
Client includes JWT in Authorization: Bearer <token> header for subsequent requests
JwtFilter intercepts requests and validates tokens
Spring Security enforces role-based access control with hierarchical permissions (e.g., Parents access own Students)

### Role-Based Access Control

ROLE_ADMIN: Full access to all management, shuttle creation/deletion, Student RFID setup
ROLE_PARENT: Access to linked Students' details and check-ins
ROLE_STUDENT: Personal profile access and check-in/out
ROLE_OPERATOR: Manage assigned Drivers and shuttles
ROLE_DRIVER: Update shuttle status and routes

### Database Schema
Key entities:

User: Core user information with role, profile picture, and relationships (Parent-Student, Operator-Driver)
Shuttle: Shuttle details with Driver/Operator assignment, route, capacity, and status
Student: Student-specific fields (grade, section, RFID tag, fingerprint hash, assigned shuttle)
Driver: Driver-specific fields (license number, emergency contact)
Operator: Operator-specific fields (manages multiple Drivers)
ForgotPassword: OTP-based password reset tracking
CheckIn: Check-in/out records linked to Students and Shuttles

### Code Quality

Clean Architecture: Separation of concerns with distinct controller, service, and repository layers
RESTful Design: Follows REST principles with proper HTTP methods and status codes
Error Handling: Comprehensive exception handling with meaningful error messages
Input Validation: Bean validation and manual checks for data integrity
Security First: JWT authentication, password encryption, role-based access control with ownership checks

### Scalability Considerations

Stateless Authentication: JWT tokens enable horizontal scaling
Database Optimization: JPA query optimization with fetch strategies
File Upload Support: Handles large files (up to 500MB) for profile pictures
Configurable Properties: Externalized configuration for easy deployment

### Documentation

Swagger Integration: Self-documenting API with interactive testing
Clear Endpoint Structure: Logical resource organization (e.g., /api/shuttles, /api/students)
Detailed Comments: Well-commented code for maintainability