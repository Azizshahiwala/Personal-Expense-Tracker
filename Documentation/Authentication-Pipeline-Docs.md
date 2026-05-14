# Authentication Pipeline — Developer Documentation

**Module:** `Routes/Authentication.py`  
**Paired With:** `Models/Database.py`, `Models/Encrypter.py`, `Config.py`  
**Base Prefix:** `/api/auth`  
**Last Updated:** May 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Dependencies & Imports](#3-dependencies--imports)
4. [Configuration & Constants](#4-configuration--constants)
5. [Database Tables Used](#5-database-tables-used)
6. [Pydantic Schemas](#6-pydantic-schemas)
7. [Functions Reference](#7-functions-reference)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [Data Flow — Register](#9-data-flow--register)
10. [Data Flow — Login](#10-data-flow--login)
11. [Data Flow — Get User Data](#11-data-flow--get-user-data)
12. [Data Flow — Update Profile Picture](#12-data-flow--update-profile-picture)
13. [JWT Token Lifecycle](#13-jwt-token-lifecycle)
14. [Error Handling Strategy](#14-error-handling-strategy)
15. [Security Features](#15-security-features)
16. [Frontend Integration](#16-frontend-integration)
17. [Known Limitations & Future Work](#17-known-limitations--future-work)

---

## 1. Overview

The authentication pipeline handles the complete user identity lifecycle:

- **Registration** — Create an account, hash password, auto-create profile
- **Login** — Verify credentials, issue JWT token
- **Identity Verification** — Validate JWT on every protected request
- **Profile Data** — Fetch user profile by UUID or email
- **Profile Picture** — Upload and store user avatar

### File Location

```
src/Backend/
├── Routes/
│   └── Authentication.py      ← This file
├── Models/
│   ├── Database.py            ← Credentials + UserProfile tables
│   └── Encrypter.py           ← bcrypt hashing
└── Config.py                  ← JWT config, DB config
```

---

## 2. Architecture Diagram

```
React Frontend
      │
      │  HTTP Request (JSON body or headers)
      ▼
┌─────────────────────────────────────────────────────┐
│               FastAPI Router                        │
│              prefix: /api/auth                      │
│                                                     │
│  POST /register ──► registerSchema validation       │
│                          │                          │
│                          ▼                          │
│                    encrypter.create_hash()          │
│                          │                          │
│                          ▼                          │
│                    db.add(Credentials)              │
│                    db.add(UserProfile)              │
│                          │                          │
│                          ▼                          │
│                    create_access_token()            │
│                          │                          │
│                          ▼                          │
│                    Return token + user_id           │
│                                                     │
│  POST /login    ──► loginSchema validation          │
│                          │                          │
│                          ▼                          │
│                    encrypter.verify_hash()          │
│                          │                          │
│                          ▼                          │
│                    create_access_token()            │
│                          │                          │
│                          ▼                          │
│                    Return token + user object       │
│                                                     │
│  GET  /getuserdata ─► get_current_user()            │
│                          │  (verifies JWT)          │
│                          ▼                          │
│                    db.query(UserProfile)            │
│                          │                          │
│                          ▼                          │
│                    Return full profile              │
│                                                     │
│  POST /updateUserpfp ─► get_current_user()          │
│                          │  (verifies ownership)   │
│                          ▼                          │
│                    Save file to disk                │
│                          │                          │
│                          ▼                          │
│                    db.update pfp_path               │
│                          │                          │
│                          ▼                          │
│                    Return new path                  │
└─────────────────────────────────────────────────────┘
      │
      ▼
PostgreSQL Database
  ├── Credentials table
  └── UserProfile table
```

---

## 3. Dependencies & Imports

```python
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
import re, os, shutil
from datetime import datetime, timedelta
from jose import JWTError, jwt

from Models.Database import Credentials, UserProfile, get_db
from Models.Encrypter import encrypter
```

| Import | Purpose |
|--------|---------|
| `APIRouter` | Groups all auth routes under `/api/auth` |
| `Depends` | FastAPI dependency injection (get_db, get_current_user) |
| `HTTPException` | Raise standardized HTTP errors |
| `status` | HTTP status code constants (200, 400, 401, etc.) |
| `UploadFile, File` | Handle multipart file uploads |
| `Request` | Access raw HTTP request headers |
| `Session` | SQLAlchemy DB session type hint |
| `BaseModel, EmailStr` | Pydantic schema base + email validator |
| `field_validator` | Per-field validation decorators |
| `re` | Regex for name/password validation |
| `shutil` | Copy file stream to disk |
| `timedelta, datetime` | Token expiry calculation |
| `JWTError, jwt` | Encode/decode JWT tokens (python-jose) |
| `Credentials, UserProfile` | SQLAlchemy table models |
| `get_db` | Database session dependency |
| `encrypter` | bcrypt hash/verify singleton |

### Required pip packages

```
python-jose[cryptography]
passlib[bcrypt]
python-multipart
fastapi
sqlalchemy
psycopg2-binary
pydantic[email]
```

---

## 4. Configuration & Constants

Configuration is loaded from `Config.getJWTConfig()` with environment variable fallbacks:

```python
SECRET_KEY                 = Config → os.getenv('SECRET_KEY')
ALGORITHM                  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
UPLOAD_DIRECTORY           = <backend_folder>/images/user/
```

### UPLOAD_DIRECTORY

```python
UPLOAD_DIRECTORY = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "images", "user"
)
```

- Path is **relative** to `Authentication.py` — works on all OS
- Directory is auto-created on server startup if it doesn't exist
- Web-accessible path served as `/images/user/<filename>`

### Config.py — getJWTConfig() expected return

```python
@classmethod
def getJWTConfig(cls):
    return {
        "SECRET_KEY": cls.SECRET_KEY,
        "ALGORITHM": "HS256",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30
    }
```

---

## 5. Database Tables Used

### Credentials (Login/Register only)

```python
class Credentials(Base):
    __tablename__ = "Credentials"
    unique_user_id = Column(UUID, primary_key=True, default=uuid.uuid4)
    first_name     = Column(String(100))
    last_name      = Column(String(100))
    email          = Column(String(100), unique=True)
    password_hash  = Column(String(255))   # bcrypt hash — never plain text
    created_at     = Column(DateTime)
```

### UserProfile (Profile data and avatar)

```python
class UserProfile(Base):
    __tablename__ = "UserProfile"
    unique_user_id = Column(UUID, ForeignKey("Credentials.unique_user_id"))
    # Address
    country        = Column(String(100), nullable=True)
    cityAndState   = Column(String(100), nullable=True)
    postalCode     = Column(String(20),  nullable=True)
    # Info
    first_name     = Column(String(100), nullable=True)
    last_name      = Column(String(100), nullable=True)
    email          = Column(String(100), ForeignKey("Credentials.email"))
    phone_number   = Column(String(20),  nullable=True)
    bio            = Column(String(500), nullable=True)
    # Social links
    facebook_link  = Column(String(255), nullable=True)
    twitter_link   = Column(String(255), nullable=True)
    linkedin_link  = Column(String(255), nullable=True)
    instagram_link = Column(String(255), nullable=True)
    # Avatar
    pfp_path       = Column(String(255), default="/images/user/default.jpg")
```

### Relationship Between Tables

```
Credentials.unique_user_id (UUID, PK)
         │
         │  one-to-one FK
         ▼
UserProfile.unique_user_id (UUID, PK + FK)
```

Both tables share the same `unique_user_id` — they are always created together during `/register`.

---

## 6. Pydantic Schemas

Schemas are the **interface contract** between the React frontend and the backend. FastAPI automatically returns `422 Unprocessable Entity` if the incoming JSON doesn't match.

### loginSchema

```python
class loginSchema(BaseModel):
    email: EmailStr    # Must be valid email format
    password: str      # No validation here — handled in encrypter
```

**Used by:** `POST /login`

**Frontend sends:**
```json
{
  "email": "john@example.com",
  "password": "MyPass123!"
}
```

---

### registerSchema

```python
class registerSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
```

**Used by:** `POST /register`

**Frontend sends:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "MyPass123!"
}
```

#### Validators on registerSchema

| Validator | Fields | Rule |
|-----------|--------|------|
| `validate_names` | `first_name`, `last_name` | Letters only, 1–50 chars, strips whitespace |
| `validate_password` | `password` | Min 8 chars, uppercase, lowercase, digit, special char |
| `validate_email` | `email` | Strips whitespace, lowercases |

**Password regex:**
```python
r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
```

Means: at least one lowercase + one uppercase + one digit + one of `@$!%*?&` + min 8 chars total.

**Name regex:**
```python
r'^[a-zA-Z]+$'   # letters only, no spaces or numbers
```

---

## 7. Functions Reference

### Summary Table

| # | Function | Type | Auth Required | Purpose |
|---|----------|------|--------------|---------|
| 1 | `get_current_user()` | Dependency | JWT in header | Decode + verify JWT token on every protected request |
| 2 | `create_access_token()` | Utility | — | Create a signed JWT token |
| 3 | `register()` | Route | No | Create account |
| 4 | `login()` | Route | No | Verify credentials, issue token |
| 5 | `getUserData()` | Route | Yes (JWT) | Fetch UserProfile by UUID or email |
| 6 | `updateUserpfp()` | Route | Yes (JWT + ownership) | Upload and save new avatar |

---

### Function 1: `get_current_user()`

```python
def get_current_user(request: Request) -> dict:
```

**What it does:**
Reads the `Authorization` header, extracts the Bearer token, decodes it using `SECRET_KEY`, and returns the user's email and UUID.

**Used as a FastAPI Dependency** — injected into routes that need authentication:
```python
current_user: dict = Depends(get_current_user)
```

**Step by step:**
```
1. Read request.headers["Authorization"]
2. Check it starts with "Bearer "
3. Split to get the raw token string
4. jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
5. Extract "sub" (email) and "unique_user_id" from payload
6. If either is None → raise 401
7. Return {"email": str, "user_id": str}
```

**Returns:**
```python
{"email": "john@example.com", "user_id": "uuid-string-here"}
```

**Raises:**
```
401 — Authorization header missing or invalid
401 — Invalid token payload
401 — Invalid or expired token (JWTError)
```

**Note:** Does NOT query the database. Token alone is treated as proof of identity.

---

### Function 2: `create_access_token()`

```python
def create_access_token(data: dict, expires_delta: timedelta) -> str:
```

**What it does:**
Creates a signed JWT string that encodes the user's email and UUID with an expiry timestamp.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `data` | `dict` | Payload to encode — must include `"sub"` (email) and `"unique_user_id"` |
| `expires_delta` | `timedelta` | How long until token expires |

**Usage:**
```python
token = create_access_token(
    data={
        "sub": newUser.email,
        "unique_user_id": str(newUser.unique_user_id)
    },
    expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
)
```

**Token payload structure (decoded):**
```json
{
  "sub": "john@example.com",
  "unique_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "exp": 1716000000
}
```

**Returns:** JWT string (e.g. `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**Important:** Call `db.refresh(newUser)` BEFORE calling this function during registration — `unique_user_id` must be populated from the DB before encoding into the token.

---

### Function 3: `register()`

```python
@router.post("/register")
def register(user: registerSchema, db: Session = Depends(get_db))
```

See [Section 9 — Data Flow: Register](#9-data-flow--register) for full walkthrough.

---

### Function 4: `login()`

```python
@router.post("/login")
def login(user: loginSchema, db: Session = Depends(get_db))
```

See [Section 10 — Data Flow: Login](#10-data-flow--login) for full walkthrough.

---

### Function 5: `getUserData()`

```python
@router.get("/getuserdata")
def getUserData(
    target_uuid: str = "",
    target_email: str = "",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
)
```

See [Section 11 — Data Flow: Get User Data](#11-data-flow--get-user-data) for full walkthrough.

---

### Function 6: `updateUserpfp()`

```python
@router.post("/updateUserpfp/{user_id}")
def updateUserpfp(
    user_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
)
```

See [Section 12 — Data Flow: Update Profile Picture](#12-data-flow--update-profile-picture) for full walkthrough.

---

## 8. API Endpoints Reference

| Method | Endpoint | Auth | Body/Params | Returns |
|--------|----------|------|-------------|---------|
| POST | `/api/auth/register` | ❌ No | JSON body: `registerSchema` | `{ message, unique_user_id, access_token }` |
| POST | `/api/auth/login` | ❌ No | JSON body: `loginSchema` | `{ access_token, token_type, user }` |
| GET | `/api/auth/getuserdata` | ✅ JWT | Query: `target_uuid` OR `target_email` | Full `UserProfile` object |
| POST | `/api/auth/updateUserpfp/{user_id}` | ✅ JWT + Ownership | Path: `user_id`, Form: `file` | `{ message, pfp_path }` |

### Response Shapes

#### POST /register — Success `200`
```json
{
  "message": "User registered successfully.",
  "unique_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "access_token": "eyJhbGci..."
}
```

#### POST /login — Success `200`
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  }
}
```

#### GET /getuserdata — Success `200`
```json
{
  "unique_user_id": "550e8400-...",
  "fname": "John",
  "lname": "Doe",
  "bio": "I love splitting bills",
  "city": "Mumbai, Maharashtra",
  "email": "john@example.com",
  "phone_number": "+91 99999 99999",
  "pfp_path": "/images/user/UserProfile550e...20260501.jpg",
  "country": "India",
  "postalCode": "400001",
  "instagram_link": "https://instagram.com/john",
  "facebook_link": null,
  "linkedin_link": null,
  "twitter_link": null
}
```

#### POST /updateUserpfp — Success `200`
```json
{
  "message": "Profile picture updated successfully.",
  "pfp_path": "/images/user/UserProfile550e...20260513120000.jpg"
}
```

### Error Response Format

All errors follow FastAPI's standard shape. Frontend reads `data.detail`:

```json
{ "detail": "Email already registered." }
{ "detail": "Invalid email or password." }
{ "detail": "Authorization header missing or invalid" }
{ "detail": "File type .exe not allowed. Use jpg, png, webp, or gif." }
```

---

## 9. Data Flow — Register

```
Frontend (SignUpForm.tsx)
    │
    │  POST /api/auth/register
    │  Body: { first_name, last_name, email, password }
    │  Header: Content-Type: application/json
    ▼
registerSchema (Pydantic)
    │  validate_names: letters only, 1–50 chars
    │  validate_password: regex strength check
    │  validate_email: strip + lowercase
    │  If invalid → 422 Unprocessable Entity (auto)
    ▼
register() route handler
    │
    ├─ sanitize: strip() + lower() (double-safety)
    │
    ├─ db.query(Credentials).filter(email == user.email).first()
    │      If exists → raise 400 "Email already registered."
    │
    ├─ encrypter.create_hash(user.password)
    │      bcrypt salt + hash → password_hash string
    │
    ├─ Credentials(first_name, last_name, email, password_hash)
    ├─ db.add(newUser)
    ├─ db.commit()
    │
    ├─ db.refresh(newUser)         ← MUST be before create_access_token
    │      Populates: newUser.unique_user_id (UUID from DB)
    │
    ├─ create_access_token({"sub": email, "unique_user_id": uuid})
    │      Returns signed JWT string
    │
    ├─ UserProfile(unique_user_id, first_name, last_name, email, pfp_path)
    ├─ db.add(newProfile)
    ├─ db.commit()
    │
    └─ Return: { message, unique_user_id, access_token }
    ▼
Frontend receives token
    │
    ├─ login({ id, name, email, role }) → AuthContext
    ├─ localStorage.setItem('access_token', token)
    └─ navigate('/chatroom/room-selection')
```

---

## 10. Data Flow — Login

```
Frontend (SignInForm.tsx)
    │
    │  POST /api/auth/login
    │  Body: { email, password }
    │  Header: Content-Type: application/json
    ▼
loginSchema (Pydantic)
    │  EmailStr → validates email format
    │  password: str → no constraint (checked by encrypter)
    ▼
login() route handler
    │
    ├─ sanitize: user.email.strip().lower()
    │
    ├─ db.query(Credentials).filter(email.ilike(user.email)).first()
    │      ilike = case-insensitive match
    │      If not found → raise 401 "Invalid email or password."
    │      (Same message for not-found AND wrong-password — prevents
    │       user enumeration attacks)
    │
    ├─ encrypter.verify_hash(user.password, db_user.password_hash)
    │      bcrypt.checkpw(plain, stored_hash)
    │      If False → raise 401 "Invalid email or password."
    │
    ├─ create_access_token({"sub": email, "unique_user_id": uuid})
    │
    └─ Return: { access_token, token_type: "bearer", user: { id, first_name, last_name, email } }
    ▼
Frontend receives token
    │
    ├─ login(data.user) → AuthContext
    ├─ localStorage.setItem('access_token', data.access_token)
    └─ navigate('/chatroom/room-selection')
```

---

## 11. Data Flow — Get User Data

```
Frontend (any component that needs profile data)
    │
    │  GET /api/auth/getuserdata?target_uuid=550e8400-...
    │  Header: Authorization: Bearer <token>
    ▼
get_current_user() [Dependency]
    │  Read Authorization header
    │  Split "Bearer <token>"
    │  jwt.decode(token, SECRET_KEY)
    │  Extract sub (email) + unique_user_id
    │  If invalid/expired → 401
    │  Return { email, user_id }
    ▼
getUserData() route handler
    │
    ├─ If target_uuid == "" AND target_email == "" → raise 400
    │
    ├─ If target_uuid provided:
    │      db.query(UserProfile).filter(unique_user_id == target_uuid).first()
    │
    ├─ If target_email provided:
    │      db.query(UserProfile).filter(email == target_email).first()
    │
    ├─ If profile is None → raise 404 "User not found"
    │
    └─ Return all UserProfile fields as dict
    ▼
Frontend receives profile object
    │
    └─ Populate: UserInfoCard, UserAddressCard, UserMetaCard components
```

**Note:** Any authenticated user can query any profile by UUID/email. If you want users to only see their own profile, add this check:

```python
# Optional: restrict to own profile only
if target_uuid and target_uuid != current_user["user_id"]:
    raise HTTPException(status_code=403, detail="Cannot view other profiles.")
```

---

## 12. Data Flow — Update Profile Picture

```
Frontend (UserProfile page — file input)
    │
    │  POST /api/auth/updateUserpfp/550e8400-...
    │  Header: Authorization: Bearer <token>
    │  Content-Type: multipart/form-data
    │  Body: file (binary)
    ▼
get_current_user() [Dependency]
    │  Verify JWT → return { email, user_id }
    ▼
updateUserpfp() route handler
    │
    ├─ if not user_id → raise 400
    │
    ├─ if user_id != current_user["user_id"] → raise 403
    │      Ownership check: can only update YOUR OWN picture
    │
    ├─ Extract file extension: file.filename.split(".")[-1].lower()
    │
    ├─ Validate extension in {"jpg","jpeg","png","webp","gif"}
    │      If not → raise 400 "File type not allowed"
    │
    ├─ Build filename: UserProfile{user_id}{timestamp}.{ext}
    ├─ Build path: UPLOAD_DIRECTORY / newfilename
    │
    ├─ with open(filelocation, "wb") as writer:
    │      shutil.copyfileobj(file.file, writer)
    │      Save file bytes to disk
    │
    ├─ web_path = "/images/user/{newfilename}"
    │
    ├─ uuid.UUID(user_id)
    │      Cast string → UUID type (required for PostgreSQL UUID column)
    │
    ├─ db.query(UserProfile).filter(unique_user_id == user_uuid).first()
    │      If None → raise 404
    │
    ├─ newpfp.pfp_path = web_path
    ├─ db.commit()
    ├─ db.refresh(newpfp)
    │
    └─ Return: { message, pfp_path }
    ▼
Frontend receives new pfp_path
    │
    └─ Update <img src={pfp_path}> in header/UserDropdown.tsx and UserMetaCard.tsx
```

---

## 13. JWT Token Lifecycle

### Structure

A JWT has 3 parts separated by `.`:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   ← Header (base64)
.eyJzdWIiOiJqb2huQGV4YW1wbGUuY29tIiwidW5pcXVlX3VzZXJfaWQiOiI1NTBlODQwMC0uLi4iLCJleHAiOjE3MTYwMDAwMDB9  ← Payload (base64)
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c   ← Signature (HMAC-SHA256)
```

### Payload (what's encoded)

```json
{
  "sub": "john@example.com",
  "unique_user_id": "550e8400-e29b-41d4-a716-446655440000",
  "exp": 1716001800
}
```

| Field | Value | Purpose |
|-------|-------|---------|
| `sub` | User email | Standard JWT subject claim |
| `unique_user_id` | UUID string | Used to query DB without extra lookup |
| `exp` | Unix timestamp | Token expiry — validated automatically by `jwt.decode()` |

### Lifecycle

```
1. User registers or logs in
      ↓
2. Backend calls create_access_token()
      ↓
3. Token returned to frontend
      ↓
4. Frontend stores in localStorage
      ↓
5. Frontend sends in every protected request:
   Authorization: Bearer <token>
      ↓
6. Backend calls get_current_user() on protected routes
      ↓
7. jwt.decode() verifies signature + checks exp
      ↓
8. If expired → 401 → Frontend clears localStorage → redirect to /signin
      ↓
9. Token expires after ACCESS_TOKEN_EXPIRE_MINUTES (default: 30)
```

### Where Token is Stored (Frontend)

```typescript
// After login/register
localStorage.setItem('access_token', data.access_token);

// On every protected API call
headers: {
  "Authorization": `Bearer ${localStorage.getItem('access_token')}`
}

// On logout
localStorage.removeItem('access_token');
localStorage.removeItem('user');
```

---

## 14. Error Handling Strategy

Every route uses a three-tier exception pattern:

```python
try:
    # Route logic
    ...
except HTTPException:
    db.rollback()    # Only in write routes
    raise            # Re-raise exactly as-is — don't swallow it

except ValueError as ve:
    db.rollback()
    raise HTTPException(status_code=400, detail=str(ve))

except Exception as e:
    db.rollback()
    print(f"Error: {e}")    # Log to server console
    raise HTTPException(status_code=500, detail="Internal server error.")
```

### Why three tiers?

| Exception | Why handle separately |
|-----------|----------------------|
| `HTTPException` | Already formatted for HTTP — just re-raise, don't convert |
| `ValueError` | Pydantic/business logic errors — convert to 400 |
| `Exception` | Unexpected errors — always return 500, never leak details |

### Status Codes Used

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid input (email exists, bad file type) |
| 401 | Unauthorized | Wrong credentials, invalid/expired token |
| 403 | Forbidden | Valid token but wrong permissions (ownership check) |
| 404 | Not Found | User profile not found |
| 422 | Unprocessable Entity | Pydantic schema validation failed (automatic) |
| 500 | Internal Server Error | Unexpected server error |

---

## 15. Security Features

| Feature | Implementation | Location |
|---------|---------------|----------|
| **Password hashing** | bcrypt via `encrypter.create_hash()` — never stores plain text | `register()` |
| **Password verification** | bcrypt `checkpw` — timing-safe comparison | `login()` |
| **JWT signing** | HS256 algorithm with `SECRET_KEY` | `create_access_token()` |
| **Token expiry** | `exp` claim checked automatically by `jwt.decode()` | `get_current_user()` |
| **User enumeration prevention** | Same error message for "email not found" AND "wrong password" | `login()` |
| **Ownership enforcement** | `user_id != current_user["user_id"]` → 403 | `updateUserpfp()` |
| **File type validation** | Whitelist: jpg, jpeg, png, webp, gif only | `updateUserpfp()` |
| **Input sanitization** | `.strip().lower()` on email, Pydantic validators on names | Schemas + routes |
| **Email case-insensitive login** | `.ilike()` filter in login query | `login()` |
| **UUID type casting** | `uuid.UUID(user_id)` before DB query | `updateUserpfp()` |

---

## 16. Frontend Integration

### Register (SignUpForm.tsx)

```typescript
const response = await fetch(`${import.meta.env.VITE_API_KEY}/api/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    first_name: firstName,
    last_name: lastName,
    email: email,
    password: password
  })
});

const data = await response.json();

if (!response.ok) {
  setErrorMsg(data.detail);   // e.g. "Email already registered."
  return;
}

login({ id: data.unique_user_id, name: ..., email: ..., role: 'member' });
localStorage.setItem('access_token', data.access_token);
navigate('/chatroom/room-selection');
```

### Login (SignInForm.tsx)

```typescript
const response = await fetch(`${import.meta.env.VITE_API_KEY}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});

const data = await response.json();

if (!response.ok) {
  setErrorMsg(data.detail);   // e.g. "Invalid email or password."
  return;
}

login({
  id: data.user.id,
  name: `${data.user.first_name} ${data.user.last_name}`,
  email: data.user.email,
  role: 'member'
});
localStorage.setItem('access_token', data.access_token);
navigate('/chatroom/room-selection');
```

### Get User Data (any component)

```typescript
const response = await fetch(
  `${import.meta.env.VITE_API_KEY}/api/auth/getuserdata?target_uuid=${userId}`,
  {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem('access_token')}`
    }
  }
);

const profile = await response.json();
// profile.fname, profile.lname, profile.pfp_path, etc.
```

### Update Profile Picture

```typescript
const formData = new FormData();
formData.append('file', selectedFile);   // <input type="file"> value

const response = await fetch(
  `${import.meta.env.VITE_API_KEY}/api/auth/updateUserpfp/${userId}`,
  {
    method: "POST",
    headers: {
      // Note: DO NOT set Content-Type manually for FormData
      // Browser sets it automatically with the boundary
      "Authorization": `Bearer ${localStorage.getItem('access_token')}`
    },
    body: formData
  }
);

const data = await response.json();
// data.pfp_path → update <img src={data.pfp_path} />
```

> **Important:** Never set `Content-Type: application/json` when sending `FormData`. The browser sets it automatically with the correct multipart boundary.

---

## 17. Known Limitations & Future Work

| # | Limitation | Impact | Suggested Fix |
|---|-----------|--------|---------------|
| 1 | No refresh token | Token expires in 30 min, user gets logged out | Add `POST /api/auth/refresh` with a long-lived refresh token stored in httpOnly cookie |
| 2 | No email verification | Anyone can register with a fake email | Add verification email step using SMTP (e.g. SendGrid) |
| 3 | No password reset | Users who forget password are locked out | Add `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` |
| 4 | Files served from local disk | Doesn't work in production (Railway/Render wipes local storage) | Move file storage to S3 or Cloudinary |
| 5 | getUserData is public to all logged-in users | Any user can see any other user's full profile | Add authorization check: only allow own profile or group members |
| 6 | No rate limiting | Brute-force login attacks possible | Add `slowapi` rate limiting on `/login` and `/register` |
| 7 | Token not invalidated on logout | Old tokens remain valid until expiry | Add a token blacklist (Redis) or use short expiry + refresh pattern |
| 8 | `created_at` in Credentials is nullable | No auto-timestamp on registration | Add `server_default=func.now()` to the column |

---

*End of Authentication Pipeline Documentation*
