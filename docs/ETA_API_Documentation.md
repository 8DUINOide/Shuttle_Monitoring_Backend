# ETA API Documentation

API documentation for testing ETA (Estimated Time of Arrival) endpoints in Postman.

---

## Authentication

All endpoints require a Bearer token in the Authorization header.

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**To get a token:**
```
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
    "username": "admin",
    "password": "admin"
}
```

---

## Endpoints

### 1. Get Shuttle ETA to Destination

Returns the ETA from the shuttle's current location to its destination.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/eta/shuttle/{id}` |
| **Auth** | Bearer Token |

**Example Request:**
```
GET http://localhost:8080/api/eta/shuttle/1
Authorization: Bearer {{token}}
```

**Example Response (Success):**
```json
{
    "shuttleId": 1,
    "shuttleName": "Shuttle A1",
    "origin": {
        "lat": 12.939602,
        "lng": 123.829645
    },
    "destination": {
        "lat": 12.981934,
        "lng": 124.028401
    },
    "distance": "32.1 km",
    "duration": "52 min",
    "eta": "32.1 km, 52 min",
    "distanceMeters": 32060.723,
    "durationSeconds": 3168.337,
    "updatedAt": "2026-02-01T11:56:00"
}
```

**Example Response (No Destination Set):**
```json
{
    "shuttleId": 1,
    "shuttleName": "Shuttle A1",
    "origin": { "lat": 12.939602, "lng": 123.829645 },
    "destination": { "lat": 0, "lng": 0 },
    "distance": "Unknown",
    "duration": "Unknown",
    "eta": "Set destination first",
    "updatedAt": "2026-02-01T11:56:00"
}
```

---

### 2. Get Student ETAs for a Shuttle

Returns ETAs from the shuttle to each assigned student's location.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/eta/shuttle/{id}/students` |
| **Auth** | Bearer Token |

**Example Request:**
```
GET http://localhost:8080/api/eta/shuttle/1/students
Authorization: Bearer {{token}}
```

**Example Response:**
```json
{
    "shuttleId": 1,
    "shuttleName": "Shuttle A1",
    "shuttleLocation": {
        "lat": 12.939602,
        "lng": 123.829645
    },
    "students": [
        {
            "studentId": 1,
            "name": "Maria Dela Cruz",
            "location": { "lat": 12.985995, "lng": 124.049923 },
            "distance": "5.2 km",
            "duration": "12 min",
            "eta": "5.2 km, 12 min"
        },
        {
            "studentId": 2,
            "name": "Juan Santos",
            "location": { "lat": 12.975123, "lng": 124.035678 },
            "distance": "8.1 km",
            "duration": "18 min",
            "eta": "8.1 km, 18 min"
        }
    ],
    "totalStudents": 2,
    "updatedAt": "2026-02-01T11:56:00"
}
```

---

### 3. Get Shuttles for Map (with ETA)

Returns all shuttles with computed ETA for the Live Map display.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `http://localhost:8080/api/shuttles/map` |
| **Auth** | Bearer Token |

**Example Request:**
```
GET http://localhost:8080/api/shuttles/map
Authorization: Bearer {{token}}
```

**Example Response:**
```json
[
    {
        "shuttleId": 1,
        "name": "Shuttle A1",
        "status": "ACTIVE",
        "route": "Buhi to Iriga",
        "latitude": 12.939602,
        "longitude": 123.829645,
        "destinationLatitude": 12.981934,
        "destinationLongitude": 124.028401,
        "eta": "32.1 km, 52 min",
        "driver": { "username": "driver_pedro" }
    }
]
```

---

## Postman Collection Setup

### Environment Variables
Create these variables in your Postman environment:

| Variable | Initial Value |
|----------|---------------|
| `base_url` | `http://localhost:8080` |
| `token` | (leave empty, set after login) |

### Pre-request Script (Optional)
Add to collection to auto-login:
```javascript
// Auto-login if token is missing
if (!pm.environment.get("token")) {
    pm.sendRequest({
        url: pm.environment.get("base_url") + "/api/auth/login",
        method: "POST",
        header: { "Content-Type": "application/json" },
        body: {
            mode: "raw",
            raw: JSON.stringify({ username: "admin", password: "admin" })
        }
    }, function (err, res) {
        pm.environment.set("token", res.json().token);
    });
}
```

---

## Error Responses

| Status | Description |
|--------|-------------|
| `401` | Unauthorized - Invalid or missing token |
| `400` | Bad Request - Shuttle not found |
| `500` | Server Error - Mapbox API issue |

**Example Error:**
```json
{
    "error": "Shuttle not found",
    "status": 400
}
```
