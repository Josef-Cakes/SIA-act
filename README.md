# AuthFlow — Full-Stack Login & Registration System
**Spring Boot (Java) + React.js + Supabase (PostgreSQL)**

---

## Architecture Overview

```
React Frontend (Vite)          Spring Boot Backend           Supabase (PostgreSQL)
      :5173           ─────►        :8080           ─────►    db.*.supabase.co:5432
  (No direct DB)            (All DB interaction)          (Cloud PostgreSQL)
```

> **Key rule**: React ONLY talks to Spring Boot. Spring Boot ONLY talks to Supabase via JPA.

---

## Project Structure

```
project/
├── backend/                          ← Spring Boot API
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/authapp/
│       │   ├── AuthApplication.java
│       │   ├── entity/User.java               ← id, username, email, password, profileImage
│       │   ├── repository/UserRepository.java  ← JpaRepository
│       │   ├── service/UserService.java        ← Business logic, BCrypt
│       │   ├── controller/
│       │   │   ├── AuthController.java         ← POST /api/register, POST /api/login
│       │   │   └── UserController.java         ← GET/PUT profile, PUT password, POST photo
│       │   ├── dto/                            ← Request & Response DTOs
│       │   └── config/CorsConfig.java
│       └── resources/application.properties    ← Supabase JDBC config
│
└── frontend/                         ← React (Vite)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx                             ← Routes: /login, /register, /dashboard
        ├── main.jsx
        ├── index.css
        └── features/
            ├── auth/
            │   ├── Login.jsx                   ← Full error handling
            │   ├── Register.jsx                ← Password match check + errors
            │   └── authService.js              ← All Axios calls to Spring Boot
            └── dashboard/
                └── Dashboard.jsx               ← Protected route, shows user info
```

---

## Backend Setup — Spring Boot

### 1. Configure Supabase Connection
Open `backend/src/main/resources/application.properties` and fill in:

```properties
spring.datasource.url=jdbc:postgresql://db.YOUR_PROJECT_REF.supabase.co:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=YOUR_DB_PASSWORD
```

**Where to find these:**
- Go to [supabase.com](https://supabase.com) → Your Project → **Settings** → **Database**
- Copy the **JDBC URL** (under "Connection string" → Java tab)
- Copy the **database password** you set when creating the project

### 2. Run the Backend
```bash
cd backend
./mvnw spring-boot:run
# API is live at http://localhost:8080
```

### 3. The `users` table will be auto-created by Hibernate (`ddl-auto=update`)

---

## Frontend Setup — React

```bash
cd frontend
npm install
npm run dev
# App is live at http://localhost:5173
```

---

## API Endpoints Reference

| Method | Endpoint                     | Description                    | Body / Params                          |
|--------|------------------------------|--------------------------------|----------------------------------------|
| POST   | `/api/register`              | Create new user account        | `{ username, email, password, fullName }` |
| POST   | `/api/login`                 | Authenticate user              | `{ email, password }`                  |
| GET    | `/api/user/profile/{userId}` | Get user profile               | Path variable: userId                  |
| PUT    | `/api/user/profile/{userId}` | Edit profile                   | `{ username, email, fullName, phone }` |
| PUT    | `/api/user/password/{userId}`| Change password                | `{ currentPassword, newPassword, confirmPassword }` |
| POST   | `/api/user/photo/{userId}`   | Upload profile image (BLOB)    | `multipart/form-data: file`            |
| GET    | `/api/user/photo/{userId}`   | Retrieve profile image bytes   | Path variable: userId                  |

---

## API Response Format

All APIs return a consistent JSON structure:

```json
{
  "success": true,
  "message": "Login successful! Welcome back, john.",
  "data": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phone": null,
    "hasProfileImage": false,
    "createdAt": "2026-03-05T10:30:00"
  }
}
```

**Failure response:**
```json
{
  "success": false,
  "message": "Invalid credentials. Incorrect password.",
  "data": null
}
```

---

## Error Scenarios Handled

### Frontend (Client-side)
| Scenario | Where | Behavior |
|---|---|---|
| Empty fields | Login + Register | Red field error message shown |
| Invalid email format | Login + Register | Field-level error shown |
| Password < 6 chars | Register | Field error + strength indicator |
| Password ≠ Confirm Password | Register | Error shown, API NOT called |
| Username < 3 chars | Register | Field error shown |

### Backend (Server-side → shown in frontend)
| Scenario | HTTP Status | Message |
|---|---|---|
| Email already exists | 409 Conflict | "An account with this email already exists." |
| Username already taken | 409 Conflict | "This username is already taken." |
| Wrong password | 401 Unauthorized | "Invalid credentials. Incorrect password." |
| Email not found | 401 Unauthorized | "Invalid credentials. No account found with that email." |
| Server unreachable | N/A (network err) | "Cannot connect to the server." |

---

## Authentication Design (No JWT)

Per requirements, this system uses **direct credential validation**:

1. Client sends `{ email, password }` to `POST /api/login`
2. Spring Boot finds the user by email from the database
3. Spring Boot uses `BCryptPasswordEncoder.matches()` to verify the password
4. Returns `{ success: true/false, message, data: userObject }`
5. React stores the user object in `localStorage` and redirects to `/dashboard`

Passwords are **never stored in plain text** — BCrypt hashing is applied at registration.

---

## Testing with Postman

### Register
```
POST http://localhost:8080/api/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "fullName": "Test User"
}
```

### Login
```
POST http://localhost:8080/api/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

### Upload Photo
```
POST http://localhost:8080/api/user/photo/1
Content-Type: multipart/form-data

file: [select a .jpg or .png file]
```

---

## Technologies Used

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6, Axios |
| Backend | Java 17, Spring Boot 3.2, Spring Data JPA |
| Database | Supabase (PostgreSQL via JDBC) |
| Security | BCrypt (spring-security-crypto) |
| ORM | Hibernate (auto DDL) |

# SIA-act
Final Project Development : WEB using ReactJs + API Integration
