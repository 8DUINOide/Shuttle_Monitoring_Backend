# Mobile App API Integration Guide

API documentation for React Native mobile app developers integrating with the Shuttle Monitoring Backend.

**Base URL (Production):** `http://188.166.176.16:8080`  
**Base URL (Local):** `http://localhost:8080`

---

## 1. Authentication

### 1.1 Login

**Endpoint:** `POST /api/auth/sign-in`

**Request Body:**
```json
{
  "usernameOrEmail": "parent@example.com",
  "password": "password123"
}
```

**Success Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": 5,
  "role": "ROLE_PARENT",
  "email": "parent@example.com"
}
```

**Error Response (401):**
```json
{
  "error": "Invalid username or password"
}
```

**Usage:** Store `access_token` and add to all requests:
```
Authorization: Bearer <access_token>
```

---

### 1.2 Register

**Endpoint:** `POST /api/auth/sign-up`

**Request Body:**
```json
{
  "username": "newparent",
  "email": "newparent@example.com",
  "password": "SecurePass123!",
  "role": "PARENT"
}
```

**Success Response (200 OK):**
```json
{
  "message": "User registered successfully"
}
```

---

### 1.3 Forgot Password

**Step 1 - Request OTP:** `POST /api/forgotPassword/verifyMail/{email}`

**Step 2 - Verify OTP:** `POST /api/forgotPassword/verifyOtp/{otp}/{email}`

**Step 3 - Reset Password:** `POST /api/forgotPassword/changePassword/{email}`
```json
{
  "newPassword": "NewSecurePass123!",
  "repeatPassword": "NewSecurePass123!"
}
```

---

## 2. Parent Features

### 2.1 Get My Children

**Endpoint:** `GET /api/parents/{parentId}/students`

**Response (200 OK):**
```json
[
  {
    "studentId": 5,
    "fullName": "John Doe Jr.",
    "grade": "Grade 10",
    "section": "Section A",
    "status": "Checked In",
    "lastCheckInTime": "2026-01-30T07:30:00",
    "assignedShuttle": {
      "shuttleId": 1,
      "name": "Shuttle Blue",
      "route": "Route A - North"
    }
  }
]
```

---

### 2.2 Track Shuttle Location

**Endpoint:** `GET /api/shuttles/{shuttleId}`

**Response (200 OK):**
```json
{
  "shuttleId": 1,
  "name": "Shuttle Blue",
  "latitude": 14.5995,
  "longitude": 120.9842,
  "eta": "15 mins",
  "status": "ACTIVE",
  "driver": {
    "contactPhone": "+63-912-345-6789"
  },
  "assignedStudentLocations": [
    {
      "studentId": 5,
      "name": "John Doe Jr.",
      "latitude": 14.6010,
      "longitude": 120.9850
    }
  ]
}
```

> **Tip:** Poll this endpoint every 10 seconds for real-time tracking.

---

### 2.3 Get Check-In History

**Endpoint:** `GET /api/check-in/student/{studentId}`

**Response (200 OK):**
```json
[
  {
    "checkInId": 101,
    "type": "in",
    "status": "success",
    "timestamp": "2026-01-30T07:30:00",
    "shuttle": { "name": "Shuttle Blue" }
  },
  {
    "checkInId": 102,
    "type": "out",
    "status": "success",
    "timestamp": "2026-01-30T08:15:00",
    "shuttle": { "name": "Shuttle Blue" }
  }
]
```

---

### 2.4 Update Pickup Location

**Endpoint:** `PUT /api/students/{studentId}/location`

**Request Body:**
```json
{
  "latitude": 14.6010,
  "longitude": 120.9850,
  "currentAddress": "456 New Address, Manila"
}
```

**Response (200 OK):**
```json
{
  "message": "Location updated successfully"
}
```

---

## 3. Driver Features

### 3.1 Get My Shuttle

**Endpoint:** `GET /api/drivers/{driverId}/shuttle`

**Response (200 OK):**
```json
{
  "shuttleId": 1,
  "name": "Shuttle Blue",
  "route": "Route A - North",
  "assignedStudentsCount": 12,
  "assignedStudentLocations": [
    {
      "studentId": 5,
      "name": "John Doe Jr.",
      "latitude": 14.6010,
      "longitude": 120.9850
    }
  ]
}
```

---

### 3.2 Update GPS Location

**Endpoint:** `POST /api/shuttles/{shuttleId}/location`

**Request Body:**
```json
{
  "latitude": 14.5995,
  "longitude": 120.9842
}
```

**Response (200 OK):**
```json
{
  "message": "Location updated successfully",
  "shuttleId": 1,
  "eta": "15 mins",
  "targetLatitude": 14.6010,
  "targetLongitude": 120.9850
}
```

> **Tip:** Call every 5-10 seconds from background location service.

---

### 3.3 Process Check-In (2FA)

**Endpoint:** `POST /api/check-in/secure-scan`

**Request Body:**
```json
{
  "rfid": "RFID-12345-ABCDE",
  "fingerprint": "FPH-a3f2b9c8d7e6...",
  "shuttleId": 1
}
```

**Success Response (200 OK):**
```json
{
  "message": "Secure Check-in successful",
  "studentName": "John Doe Jr.",
  "type": "in",
  "status": "success"
}
```

**Error Responses:**
| Error | Cause |
|-------|-------|
| `RFID not recognized` | RFID not registered |
| `Fingerprint verification failed` | Fingerprint doesn't match |
| `Student is not assigned to this shuttle` | Wrong shuttle |

---

### 3.4 Single-Factor Check-In

**Endpoint:** `POST /api/check-in/scan`

**Request Body:**
```json
{
  "type": "rfid",
  "value": "RFID-12345-ABCDE",
  "shuttleId": 1
}
```

---

## 4. Student Features

### 4.1 Get My Profile

**Endpoint:** `GET /api/students/me`

**Response (200 OK):**
```json
{
  "studentId": 5,
  "fullName": "John Doe Jr.",
  "grade": "Grade 10",
  "status": "Checked In",
  "assignedShuttle": {
    "shuttleId": 1,
    "name": "Shuttle Blue",
    "eta": "15 mins"
  }
}
```

---

## 5. Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (wrong role) |
| 404 | Not Found |
| 500 | Server Error |

---

## 6. API Endpoints Summary

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sign-in` | Login |
| POST | `/api/auth/sign-up` | Register |

### Parent
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parents/{id}/students` | Get children |
| GET | `/api/shuttles/{id}` | Track shuttle |
| GET | `/api/check-in/student/{studentId}` | Check-in history |
| PUT | `/api/students/{id}/location` | Update pickup |

### Driver
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drivers/{id}/shuttle` | Get my shuttle |
| POST | `/api/shuttles/{id}/location` | Update GPS |
| POST | `/api/check-in/secure-scan` | 2FA check-in |
| POST | `/api/check-in/scan` | Single check-in |

### Student
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students/me` | Get my profile |

---

## Contact

For API questions, contact the backend development team.
