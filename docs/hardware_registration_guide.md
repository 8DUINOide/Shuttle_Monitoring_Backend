# Hardware Registration Guide: RFID & Fingerprint

This document provides technical details for hardware developers to integrate RFID and Fingerprint scanners with the Shuttle Monitoring Backend.

## Overview

The system uses a **polling-based handshake** for automatic device registration. Instead of the backend pushing data to the frontend, the frontend "pulls" the latest scan from a buffer in the backend.

### Communication Flow

1.  **Hardware Scan**: The hardware device (RFID/Fingerprint) scans a tag or finger.
2.  **POST to Backend**: Hardware sends a `POST` request to `/api/hardware/scan`.
3.  **Buffering**: The backend stores this scan in a temporary in-memory buffer.
4.  **Frontend Polling**: When the "Register Device" modal is open, the frontend polls `/api/hardware/latest` every 1.5 seconds.
5.  **Auto-Populate**: If a scan is found, the backend returns it and **clears the buffer**. The frontend then auto-fills the registration form.

---

## API Endpoints

### 1. Send Scan Data (Hardware -> Backend)

**Endpoint:** `POST /api/hardware/scan`  
**Description:** Used by the hardware to report a new scan.

**Request Body:**
```json
{
  "type": "rfid", 
  "value": "12345678"
}
```
*   `type`: Must be either `"rfid"` or `"fingerprint"`.
*   `value`: The raw ID or hash string from the scanner.

**Example C-code (Pseudo):**
```c
// Example using an HTTP Client library
String payload = "{\"type\": \"rfid\", \"value\": \"" + rfidTag + "\"}";
http.post("http://<server-ip>/api/hardware/scan", "application/json", payload);
```

### 2. Poll Latest Scan (Internal/Frontend Polling)

**Endpoint:** `GET /api/hardware/latest`  
**Description:** Returns the buffered scans and clears them for the frontend to auto-populate.

**Response:**
```json
{
  "rfid": "12345678",
  "fingerprint": "FP-hash-string"
}
```

---

### 3. Registration Persistence (Final Save)

**Endpoint:** `POST /api/check-in/register-device/{studentId}`  
**Description:** Permanently links the RFID and Fingerprint data to a specific Student. This is typically called by the **Admin Dashboard** once both values are captured, but can be called directly for testing or custom hardware registration units.

**Request Body:**
```json
{
  "rfidTag": "12345678",
  "fingerprintHash": "FP-hash-string"
}
```

**Authentication Required:** 
- Must include header: `Authorization: Bearer <Admin_Token>`

**Example Usage (cURL):**
```bash
curl -X POST http://<server-ip>/api/check-in/register-device/1 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
           "rfidTag": "RFID-123456",
           "fingerprintHash": "FP-987654"
         }'
```

---

## Hardware Implementation Best Practices

1.  **Normalization**: Ensure the `value` sent to the backend is a consistent string format (e.g., all uppercase or fixed length).
2.  **Debouncing**: Implement a short delay (e.g., 2-3 seconds) between scans of the same tag to avoid multiple POST requests for a single physical scan.
3.  **Authentication**: If the backend requires it, include the `Authorization: Bearer <token>` header. (Currently, the `/api/hardware` endpoints are designed for easy hardware access but should be secured in production).

---

## Registration Workflow (Step-by-Step)

1.  Admin opens the **Registration** tab in the Dashboard.
2.  Admin clicks **"Register Device"** for a specific student.
3.  The system starts polling for hardware input.
4.  Admin taps an RFID tag or places a finger on the scanner.
5.  The hardware `POST`s the data.
6.  The Registration form **automatically fills** with the value.
7.  The system **auto-submits** the registration once both RFID and Fingerprint are captured (or if manual submission is clicked).
