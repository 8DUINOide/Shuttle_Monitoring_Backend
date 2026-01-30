# Hardware API Integration Guide

Complete API documentation for integrating RFID readers, fingerprint scanners, and GPS modules with the Shuttle Monitoring Backend.

**Base URL (DigitalOcean):** `http://188.166.176.16:8080`  
**Base URL (Local):** `http://localhost:8080`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Device Registration](#2-device-registration)
3. [Secure Check-In (2FA)](#3-secure-check-in-2fa)
4. [Single-Factor Check-In](#4-single-factor-check-in)
5. [Manual Check-In Log](#5-manual-check-in-log)
6. [GPS Location Update](#6-gps-location-update)
7. [Raw Hardware Scan Buffer](#7-raw-hardware-scan-buffer)
8. [Get All Check-Ins](#8-get-all-check-ins)
9. [Postman Collection Import](#9-postman-collection-import)

---

## 1. Authentication

**Endpoint:** `POST /api/auth/sign-in`

Get a JWT token to authenticate subsequent requests.

### Postman Setup

| Setting | Value |
|---------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/auth/sign-in` |
| **Headers** | `Content-Type: application/json` |

### Request Body (raw JSON)

```json
{
  "username": "admin",
  "password": "admin123"
}
```

### Expected Success Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwiZXhwIjoxNzA2NjQwMDAwfQ.abc123...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 18000000,
  "role": "ROLE_ADMIN",
  "userId": 1,
  "username": "admin",
  "fullName": "System Administrator"
}
```

### Expected Error Response (401 Unauthorized)

```json
{
  "error": "Invalid username or password"
}
```

### Using the Token

Add this header to ALL subsequent requests:

```
Authorization: Bearer <accessToken>
```

---

## 2. Device Registration

**Endpoint:** `POST /api/check-in/register-device/{studentId}`

Register RFID tag and fingerprint hash for a student. **Requires ADMIN role.**

### Postman Setup

| Setting | Value |
|---------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/check-in/register-device/5` |
| **Headers** | `Content-Type: application/json` |
| | `Authorization: Bearer {{token}}` |

### Request Body (raw JSON)

```json
{
  "rfidTag": "RFID-12345-ABCDE",
  "fingerprintHash": "FPH-a3f2b9c8d7e6f5a4b3c2d1e0"
}
```

### Expected Success Response (200 OK)

```json
{
  "message": "Device registered successfully",
  "studentId": 5,
  "studentUsername": "johndoe",
  "rfidTag": "RFID-12345-ABCDE",
  "fingerprintHash": "FPH-a3f2b9c8d7e6f5a4b3c2d1e0",
  "timestamp": "2026-01-30T21:45:00"
}
```

### Expected Error Responses

**400 Bad Request - Missing fields:**
```json
{
  "error": "RFID tag and fingerprint hash required"
}
```

**404 Not Found - Invalid student ID:**
```json
{
  "error": "Student not found with id: 999"
}
```

**403 Forbidden - Non-admin user:**
```json
{
  "error": "Access Denied"
}
```

---

## 3. Secure Check-In (2FA)

**Endpoint:** `POST /api/check-in/secure-scan`

The **recommended** check-in method. Requires BOTH RFID and fingerprint for maximum security.

### Postman Setup

| Setting | Value |
|---------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/check-in/secure-scan` |
| **Headers** | `Content-Type: application/json` |
| | `Authorization: Bearer {{token}}` |

### Request Body (raw JSON)

```json
{
  "rfid": "RFID-12345-ABCDE",
  "fingerprint": "FPH-a3f2b9c8d7e6f5a4b3c2d1e0",
  "shuttleId": 1
}
```

### Expected Success Response (200 OK) - Check-IN

```json
{
  "message": "Secure Check-in successful",
  "checkInId": 101,
  "studentName": "John Doe",
  "shuttleName": "Shuttle Blue",
  "type": "in",
  "status": "success",
  "timestamp": "2026-01-30T07:30:00"
}
```

### Expected Success Response (200 OK) - Check-OUT

If the student is already checked in, calling again will check them out:

```json
{
  "message": "Secure Check-out successful",
  "checkInId": 102,
  "studentName": "John Doe",
  "shuttleName": "Shuttle Blue",
  "type": "out",
  "status": "success",
  "timestamp": "2026-01-30T08:15:00"
}
```

### Expected Error Responses

**400 Bad Request - RFID not found:**
```json
{
  "error": "RFID not recognized: RFID-UNKNOWN-12345"
}
```

**400 Bad Request - Fingerprint mismatch:**
```json
{
  "error": "Fingerprint verification failed for student: John Doe"
}
```

**400 Bad Request - Not assigned to shuttle:**
```json
{
  "error": "Student is not assigned to this shuttle"
}
```

**404 Not Found - Invalid shuttle:**
```json
{
  "error": "Shuttle not found with id: 999"
}
```

---

## 4. Single-Factor Check-In

**Endpoint:** `POST /api/check-in/scan`

Check-in with EITHER RFID **OR** Fingerprint. Less secure than 2FA.

### Postman Setup

| Setting | Value |
|---------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/check-in/scan` |
| **Headers** | `Content-Type: application/json` |
| | `Authorization: Bearer {{token}}` |

### Request Body - Using RFID

```json
{
  "type": "rfid",
  "value": "RFID-12345-ABCDE",
  "shuttleId": 1
}
```

### Request Body - Using Fingerprint

```json
{
  "type": "fingerprint",
  "value": "FPH-a3f2b9c8d7e6f5a4b3c2d1e0",
  "shuttleId": 1
}
```

### Expected Success Response (200 OK)

```json
{
  "message": "Check-in successful",
  "checkInId": 103,
  "studentName": "John Doe",
  "shuttleName": "Shuttle Blue",
  "type": "in",
  "status": "success",
  "timestamp": "2026-01-30T07:35:00"
}
```

### Expected Error Responses

**400 Bad Request - Invalid credential:**
```json
{
  "error": "No student found with rfid: RFID-INVALID-000"
}
```

---

## 5. Manual Check-In Log

**Endpoint:** `POST /api/check-in/log`

Manually log a check-in with all details. Useful for admin override or bulk logging.

### Postman Setup

| Setting | Value |
|---------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/check-in/log` |
| **Headers** | `Content-Type: application/json` |
| | `Authorization: Bearer {{token}}` |

### Request Body (raw JSON)

```json
{
  "studentId": 5,
  "shuttleId": 1,
  "rfidTag": "RFID-12345-ABCDE",
  "fingerprintHash": "FPH-a3f2b9c8d7e6f5a4b3c2d1e0",
  "type": "in"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `studentId` | Long | Yes | Student's database ID |
| `shuttleId` | Long | Yes | Shuttle's database ID |
| `rfidTag` | String | No | RFID tag used (for logging) |
| `fingerprintHash` | String | No | Fingerprint used (for logging) |
| `type` | String | Yes | `"in"` or `"out"` |

### Expected Success Response (200 OK)

```json
{
  "message": "Check-in successful",
  "checkInId": 104,
  "studentId": 5,
  "shuttleId": 1,
  "type": "in",
  "status": "success",
  "timestamp": "2026-01-30T07:40:00"
}
```

---

## 6. GPS Location Update

**Endpoint:** `POST /api/shuttles/{shuttleId}/location`

Update shuttle's GPS coordinates in real-time. Called by GPS module.

### Postman Setup

| Setting | Value |
|---------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/shuttles/1/location` |
| **Headers** | `Content-Type: application/json` |
| | `Authorization: Bearer {{token}}` |

### Request Body (raw JSON)

```json
{
  "latitude": 13.6218,
  "longitude": 123.1948
}
```

### Expected Success Response (200 OK)

```json
{
  "message": "Location updated successfully",
  "shuttleId": 1,
  "latitude": 13.6218,
  "longitude": 123.1948,
  "eta": "15 mins",
  "targetLatitude": 13.6230,
  "targetLongitude": 123.1960,
  "assignedStudentLocations": [
    {
      "studentId": 5,
      "name": "John Doe",
      "latitude": 13.6230,
      "longitude": 123.1960
    },
    {
      "studentId": 8,
      "name": "Jane Smith",
      "latitude": 13.6200,
      "longitude": 123.1920
    }
  ]
}
```

### Expected Error Responses

**400 Bad Request - Missing coordinates:**
```json
{
  "error": "Latitude and Longitude are required"
}
```

**404 Not Found - Invalid shuttle:**
```json
{
  "error": "Shuttle not found"
}
```

---

## 7. Raw Hardware Scan Buffer

For hardware that **cannot** call authenticated endpoints directly. No authentication required.

### 7a. Push Scan Data

**Endpoint:** `POST /api/hardware/scan`

Hardware sends raw scan data to this buffer.

#### Postman Setup

| Setting | Value |
|---------|-------|
| **Method** | POST |
| **URL** | `{{base_url}}/api/hardware/scan` |
| **Headers** | `Content-Type: application/json` |
| **Auth** | None (No authentication required) |

#### Request Body - RFID Scan

```json
{
  "type": "rfid",
  "value": "RFID-12345-ABCDE"
}
```

#### Request Body - Fingerprint Scan

```json
{
  "type": "fingerprint",
  "value": "FPH-a3f2b9c8d7e6f5a4b3c2d1e0"
}
```

#### Expected Success Response (200 OK)

```json
{
  "message": "Scan received",
  "type": "rfid",
  "value": "RFID-12345-ABCDE"
}
```

#### Expected Error Response (400 Bad Request)

```json
{
  "error": "Invalid payload: 'type' and 'value' required"
}
```

---

### 7b. Poll Latest Scan

**Endpoint:** `GET /api/hardware/latest`

Dashboard polls this to get buffered scans and process check-ins.

#### Postman Setup

| Setting | Value |
|---------|-------|
| **Method** | GET |
| **URL** | `{{base_url}}/api/hardware/latest` |
| **Auth** | None (No authentication required) |

#### Expected Response (200 OK) - With buffered data

```json
{
  "rfid": "RFID-12345-ABCDE",
  "fingerprint": "FPH-a3f2b9c8d7e6f5a4b3c2d1e0"
}
```

#### Expected Response (200 OK) - Empty buffer

```json
{}
```

> **Note:** Calling this endpoint **clears the buffer**. Data is consumed once read.

---

## 8. Get All Check-Ins

**Endpoint:** `GET /api/check-in/all`

Retrieve all check-in records for reporting.

### Postman Setup

| Setting | Value |
|---------|-------|
| **Method** | GET |
| **URL** | `{{base_url}}/api/check-in/all` |
| **Headers** | `Authorization: Bearer {{token}}` |

### Expected Success Response (200 OK)

```json
[
  {
    "checkInId": 101,
    "student": {
      "studentId": 5,
      "fullName": "John Doe",
      "gradeSection": "Grade 10 - A"
    },
    "shuttle": {
      "shuttleId": 1,
      "name": "Shuttle Blue"
    },
    "type": "in",
    "status": "success",
    "timestamp": "2026-01-30T07:30:00"
  },
  {
    "checkInId": 102,
    "student": {
      "studentId": 5,
      "fullName": "John Doe",
      "gradeSection": "Grade 10 - A"
    },
    "shuttle": {
      "shuttleId": 1,
      "name": "Shuttle Blue"
    },
    "type": "out",
    "status": "success",
    "timestamp": "2026-01-30T08:15:00"
  }
]
```

---

## 9. Postman Collection Import

### Environment Variables

Create a Postman Environment with these variables:

| Variable | Initial Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://188.166.176.16:8080` | API base URL |
| `token` | (leave empty) | JWT access token |

### Auto-set Token Script

Add this to the **Tests** tab of your Sign-In request to auto-save the token:

```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("token", jsonData.accessToken);
    console.log("Token saved!");
}
```

---

## Hardware Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SETUP PHASE (Admin)                          │
├─────────────────────────────────────────────────────────────────┤
│  1. POST /api/auth/sign-in → Get JWT Token                      │
│  2. POST /api/check-in/register-device/{studentId}              │
│     → Register RFID + Fingerprint for each student              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RUNTIME PHASE (Hardware)                      │
├─────────────────────────────────────────────────────────────────┤
│  Option A (Recommended - Direct API Call):                      │
│    Student scans RFID + Fingerprint                             │
│    → POST /api/check-in/secure-scan                             │
│    → Display result on LCD                                      │
│                                                                 │
│  Option B (Simple Hardware):                                    │
│    Student scans RFID                                           │
│    → POST /api/hardware/scan (no auth)                          │
│    Dashboard polls /api/hardware/latest                         │
│    → Dashboard triggers check-in                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GPS TRACKING (Continuous)                    │
├─────────────────────────────────────────────────────────────────┤
│  Every 5-10 seconds:                                            │
│    → POST /api/shuttles/{id}/location                           │
│    → Update shuttle position + calculate ETA                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Codes Reference

| HTTP Code | Meaning | Common Causes |
|-----------|---------|---------------|
| 200 | Success | Request processed successfully |
| 400 | Bad Request | Missing/invalid fields, credential mismatch |
| 401 | Unauthorized | Missing or expired JWT token |
| 403 | Forbidden | Insufficient role (needs ADMIN) |
| 404 | Not Found | Invalid studentId, shuttleId |
| 500 | Server Error | Database or internal error |

---

## Contact

For questions about the API, contact the backend development team.