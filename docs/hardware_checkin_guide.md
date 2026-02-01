# Hardware Check-In Guide: 2-Factor Authentication (RFID + Fingerprint)

This document explains the standard and secure methods for checking students into a shuttle.

## 1. Secure Check-In (Recommended: 2-Factor)

This is the standard secure process. It requires **both** an RFID tag and a Fingerprint hash for a successful check-in.

### Handshake Flow
The hardware device must collect both factors BEFORE sending the final request to the server:
1.  **RFID Scan**: Hardware reads the RFID card.
2.  **Fingerprint Scan**: Hardware reads the fingerprint.
3.  **Submission**: Hardware sends a SINGLE `POST` request containing both values.

---

### API Endpoint: Secure Check-In
**Endpoint:** `POST /api/check-in/secure-scan`  

**Request Body:**
```json
{
  "rfid": "RFID-123456",
  "fingerprint": "FP-789012",
  "shuttleId": 3
}
```
*   `rfid`: The raw RFID tag value.
*   `fingerprint`: The raw fingerprint hash/ID.
*   `shuttleId`: The ID of the shuttle where the scan is happening.

**Expected Response (200 OK):**
```json
{
  "message": "Secure Check-in successful",
  "studentName": "John Doe",
  "type": "in",
  "status": "success"
}
```

---


---

## Troubleshooting with Postman

### Testing Secure 2FA (Step-by-Step)
1.  **Set Method:** `POST`
2.  **URL:** `{{SERVER_URL}}/api/check-in/secure-scan`
3.  **Body (raw JSON):**
    ```json
    {
      "rfid": "RFID-TAG-VALUE",
      "fingerprint": "FP-HASH-VALUE",
      "shuttleId": 1
    }
    ```
4.  **Common Response Errors:**
    - `400 Bad Request`: "RFID not recognized" (Tag not registered).
    - `400 Bad Request`: "Fingerprint verification failed" (Fingerprint doesn't match that RFID's owner).
    - `400 Bad Request`: "Student is not assigned to this shuttle."

---

## FAQ for Hardware Developers

**Q: Why do I need to send both RFID and Fingerprint?**  
A: To ensure the person checking in is actually the student they claim to be. The RFID identifies the student, and the Fingerprint verifies them.

**Q: Can I send RFID first and then Fingerprint in a second request?**  
A: No. The `/secure-scan` endpoint expects both in one request. Your hardware code should store the RFID tag in a variable, wait for the fingerprint, and then send the JSON body.
