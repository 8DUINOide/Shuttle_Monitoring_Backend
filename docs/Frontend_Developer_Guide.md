# Frontend Developer Guide & API Documentation

This guide documents the API endpoints available for the Mobile/Frontend applications, organized by User Roles.

**Base URL (Production):** `http://188.166.176.16:8080`  
**Base URL (Local):** `http://localhost:8080`

---

## 1. Authentication (All Roles)

### 1.1 Login
**Purpose:** Authenticate user and retrieve JWT token.

**Endpoint:** `POST /api/auth/sign-in`

**Request Body:**
```json
{
  "usernameOrEmail": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user_id": 5,
  "username": "user",
  "email": "user@example.com",
  "status": "success"
}
```

**Usage:** Store `access_token` and add to all subsequent requests:
`Authorization: Bearer <access_token>`

### 1.2 Sign Up (Parent)
**Endpoint:** `POST /api/auth/sign-up/parents`
**Request Body:**
```json
{
  "parent": {
    "username": "parent1",
    "password": "password123",
    "email": "parent1@example.com",
    "role": "PARENT",
    "fullName": "Parent Name",
    "contactPhone": "09123456789",
    "currentAddress": "Manila"
  },
  "students": [
    {
      "username": "student1",
      "password": "password123",
      "email": "student1@example.com",
      "role": "STUDENT",
      "fullName": "Student Name",
      "contactPhone": "09123456789",
      "grade": "10",
      "section": "A",
      "currentAddress": "Manila"
    }
  ]
}
```

### 1.3 Sign Up (Operator & Drivers)
**Endpoint:** `POST /api/auth/sign-up/operators`
**Request Body:**
```json
{
    "operator": {
      "username": "operator1",
      "password": "password123",
      "email": "operator1@example.com",
      "role": "OPERATOR",
      "fullName": "Operator Name",
      "contactPhone": "09123456789"
    },
    "drivers": [
      {
        "username": "driver1",
        "password": "password123",
        "email": "driver1@example.com",
        "role": "DRIVER",
        "contactPhone": "09123456789",
        "emergencyContact": "09123456789"
      }
    ]
}
```

### 1.4 Refresh Token
**Endpoint:** `POST /api/auth/refresh-token`
**Request Body:** `{"refresh_token": "..."}`

---

## 2. Parent Role
**Purpose:** Monitor children's location, manage profile, pay fees, and communicate with operators.

### Sidebar / Features
1.  **My Profile** - View/Edit parent details.
2.  **My Children** - List linked students.
3.  **Live Map** - Track assigned shuttles.
4.  **Payments** - View and pay balances.
5.  **Messages** - Chat with Operators/Drivers.
6.  **Notifications** - Receive system alerts.

### API Endpoints

#### User Profile
*   **Get Profile:** `GET /api/parents/{id}`
    *   *Usage:* Display parent details on Profile page.
*   **Update Profile:** `PUT /api/parents/{id}`
    *   *Body:* `{"fullName": "...", "contactPhone": "...", "currentAddress": "..."}`

#### Children Management
*   **Get My Children:** `GET /api/students/parent/{parentId}`
    *   *Response:* List of Student objects.

#### Live Map & Tracking
*   **Get Student's Shuttle:** `GET /api/students/{studentId}/assigned-shuttle`
    *   *Response:* `{ "assignedShuttleId": 1, "route": "A", ... }`
*   **Track Shuttle:** `GET /api/shuttles/{shuttleId}`
    *   *Usage:* Call this to get current `latitude`, `longitude`, `eta`, and `status`. Poll every 5-10s.

#### Payments
*   **View Payments:** `GET /api/payments/parent/{parentId}`
    *   *Response:* List of payment records (Due, Paid, Overdue).
*   **Create Payment (Manual/Test):** `POST /api/payments`
    *   *Body:* `{"studentId": 1, "operatorId": 2, "amount": 1000, "dueDate": "2026-02-28T00:00:00", "paymentType": "GCASH"}`
*   **Pay:** `POST /api/payments/{paymentId}/pay`

---

## 3. Student Role
**Purpose:** View assigned shuttle, set pickup location, and check status.

### Sidebar / Features
1.  **My Profile** - View details.
2.  **My Shuttle** - View assigned shuttle info.
3.  **Set Location** - Pin pickup location (home).
4.  **Notifications** - Alerts.

### API Endpoints

#### Profile & Shuttle
*   **Get Profile:** `GET /api/students/{id}`
*   **Get Assigned Shuttle:** `GET /api/students/{studentId}/assigned-shuttle`

#### Locations
*   **Update Pickup Location:** `POST /api/students/{id}/location`
    *   *Purpose:* Student pins their home location on the map.
    *   *Body:* `{"latitude": 14.123, "longitude": 121.123}`

---

## 4. Operator Role
**Purpose:** Manage fleet (drivers) and view earnings/payments.

### Sidebar / Features
1.  **My Profile** - Operator details.
2.  **My Students** - List students assigned to my shuttles.
3.  **Payments** - View incoming payments.
4.  **Messages** - Chat with Parents/Drivers.

### API Endpoints

#### Profile
*   **Get Profile:** `GET /api/operators/{id}`
*   **Update Profile:** `PUT /api/operators/{id}`

#### Students Management
*   **Get My Students:** `GET /api/students/operator/{operatorId}`
    *   *Usage:* List all students riding in shuttles owned by this operator.

#### Payments
*   **Get Payments:** `GET /api/payments/operator/{operatorId}`
    *   *Usage:* Track payment status of assigned students.

---

## 5. Driver Role
**Purpose:** Navigate route, update shuttle location, manage ride status.

### Sidebar / Features
1.  **My Profile** - Driver details.
2.  **My Shuttle** - Current shuttle status.
3.  **Ride Controls** - Start/End ride, Update Location.
4.  **Messages** - Chat with Operator.

### API Endpoints

#### Profile & Shuttles
*   **Get Driver Profile:** `GET /api/drivers/{id}`
*   **Get Shuttle Info:** `GET /api/shuttles/{shuttleId}` (Driver must know their assigned shuttle ID, usually assigned manually or fetched via profile if linked).

#### Ride Operations (Simulation/Hardware)
*   **Start Ride:** `POST /api/shuttles/{id}/start-ride`
    *   *Body:* `{"latitude": 14.1, "longitude": 121.1}`
    *   *Effect:* Sets status to ACTIVE.
*   **Update Location (GPS):** `POST /api/shuttles/{id}/location`
    *   *Body:* `{"latitude": 14.2, "longitude": 121.2}`
    *   *Response:* Includes `eta` and next student's `targetLatitude`/`targetLongitude`.
*   **Set Destination:** `POST /api/shuttles/{id}/destination`
    *   *Body:* `{"latitude": 14.5, "longitude": 121.5}`
*   **End Ride:** `POST /api/shuttles/{id}/end-ride`
    *   *Body:* `{"latitude": 14.5, "longitude": 121.5}`
    *   *Effect:* Sets status to INACTIVE, saves to History.

---

## 6. Shared Features (Messages & Notifications)

### Messaging
**Endpoints:**
*   **Send Message:** `POST /api/messages/send`
    *   *Body:* `{"receiverId": 5, "content": "Hello"}`
*   **Get Chat History:** `GET /api/messages/history/{otherUserId}`
*   **Get Contacts:** `GET /api/messages/contacts`
*   **Get Unread Count:** `GET /api/messages/unread-count`

### Notifications
**Endpoints:**
*   **Get All:** `GET /api/notifications`
*   **Get Unread Count:** `GET /api/notifications/unread-count`
*   **Mark Read:** `PUT /api/notifications/{id}/read`
*   **Mark All Read:** `PUT /api/notifications/read-all`

---

## 7. Error Handling
Common HTTP Status Codes:
*   `200 OK` - Success
*   `400 Bad Request` - Validation error or missing fields.
*   `401 Unauthorized` - Invalid or missing JWT token.
*   `403 Forbidden` - User does not have permission (Admin only).
*   `404 Not Found` - Resource not found.
*   `500 Server Error` - Internal system error.

*Note: All "Admin-only" endpoints (e.g., getting all users, assigning shuttles, deleting records) are excluded from this guide.*
