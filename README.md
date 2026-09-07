# 🚑 ResQPatient — Emergency Ambulance Dispatch & Response Platform

> **Production-ready, highly available emergency medical dispatch backend built with Node.js, Express.js 5, TypeScript, PostgreSQL, and Prisma 8 RC.**

[![Node.js](https://img.shields.io/badge/Node.js-v24%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-black.svg)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-8.0.0--rc-purple.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-In--Memory%20Caching-red.svg)](https://redis.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Payment%20Intents-635bff.svg)](https://stripe.com/)
[![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Database Entity Relationship Diagram](#-database-entity-relationship-diagram)
- [Emergency Dispatch State Machine](#-emergency-dispatch-state-machine)
- [Strict Role-Based Access Control (RBAC)](#-strict-role-based-access-control-rbac)
- [Technology Stack](#-technology-stack)
- [Interactive Swagger API Documentation](#-interactive-swagger-api-documentation)
- [API Reference](#-api-reference)
- [Installation & Local Setup](#-installation--local-setup)
- [Prisma 8 RC Workflows](#-prisma-8-rc-workflows)
- [Database Seeding & Default Credentials](#-database-seeding--default-credentials)
- [Testing](#-testing)
- [Postman Collection](#-postman-collection)
- [Production Deployment Guide](#-production-deployment-guide)

---

## 🌟 Overview

**ResQPatient** is a mission-critical backend engine designed to minimize ambulance response times during acute medical emergencies. It provides:

* **Real-time Proximity Dispatch**: Automatic geospatial nearest-ambulance assignment using spherical Haversine trigonometric algorithms.
* **Deterministic Server-Side Fare Calculation**: Transparent fare structures computed server-side taking into account base fee, distance, vehicle tier (Basic, Oxygen, ICU), and urgency level (Low, Medium, High, Critical).
* **Strict State Transition Safety**: Enforcement of sequential lifecycle progression (`REQUESTED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `ACCEPTED` $\rightarrow$ `EN_ROUTE` $\rightarrow$ `ARRIVED` $\rightarrow$ `PICKED_UP` $\rightarrow$ `AT_HOSPITAL` $\rightarrow$ `COMPLETED`).
* **Emergency Cancellation Protection**: Strict business rules preventing emergency cancellation once the ambulance is `EN_ROUTE` or beyond to protect emergency responder safety and logistics.
* **Stripe Payments & Idempotent Webhooks**: Secure payment intent lifecycle for patient trip settlements with webhook replay defense.
* **Resilient Distributed Caching**: Redis caching with automated fallback to thread-safe in-memory cache when Redis is temporarily offline.
* **Immutable Audit Trail**: Security-grade audit logging capturing all authentication events, administrative actions, emergency state updates, and financial transactions with IP address and user-agent metadata.

---

## 🏛 System Architecture

```mermaid
flowchart TD
    subgraph Clients["Clients & Consumers"]
        PatientApp["📱 Patient Mobile / Web"]
        DriverApp["🚑 Driver Mobile / In-Vehicle"]
        AdminPortal["💻 Admin Dashboard"]
        StripeWebhook["💳 Stripe Gateway Webhook"]
    end

    subgraph SecurityLayer["Security & Gateway (Express 5)"]
        Helmet["🛡️ Helmet HTTP Headers"]
        Cors["🌐 CORS Protection"]
        RateLimiter["⏱️ Rate Limiter (200 req / 15m)"]
        BodyParser["📦 JSON & Raw Buffer Capture"]
        AuthMiddleware["🔐 JWT & RBAC Middleware"]
    end

    subgraph CoreServices["Domain Modules & Services"]
        AuthService["Auth & Token Service"]
        UserService["User & Profile Service"]
        DriverService["Driver Profile & Trips Service"]
        AmbulanceService["Ambulance Geo & Fleet Service"]
        HospitalService["Hospital Bed & Capacity Service"]
        EmergencyService["Emergency & Dispatch Engine"]
        PaymentService["Stripe Payment Service"]
        AdminService["Admin Moderation & Analytics"]
    end

    subgraph Utilities["Core Utilities"]
        Haversine["📍 Geo Haversine Math"]
        FareCalculator["💰 Fare Calculator"]
        AuditLogger["📜 Immutable Audit Logger"]
        RedisCache["⚡ Redis / In-Memory Cache"]
    end

    subgraph DataLayer["Data Layer (Prisma 8 RC)"]
        PrismaORM["Prisma 8 ORM (Contract First)"]
        PostgresDB[("🐘 PostgreSQL 16+")]
    end

    Clients --> SecurityLayer
    SecurityLayer --> AuthMiddleware
    AuthMiddleware --> CoreServices
    StripeWebhook --> PaymentService

    EmergencyService --> Haversine
    EmergencyService --> FareCalculator
    AmbulanceService --> Haversine
    AmbulanceService --> RedisCache
    HospitalService --> RedisCache
    AdminService --> RedisCache
    CoreServices --> AuditLogger

    CoreServices --> PrismaORM
    AuditLogger --> PrismaORM
    PrismaORM --> PostgresDB
```

---

## 📊 Database Entity Relationship Diagram

The database uses PostgreSQL with relational integrity, foreign key cascades, and compound indexes:

```mermaid
erDiagram
    User ||--o| DriverProfile : "has"
    User ||--o| Ambulance : "drives"
    User ||--o{ Emergency : "requests (Patient)"
    User ||--o{ Dispatch : "fulfills (Driver)"
    User ||--o{ Payment : "pays"
    User ||--o{ AuditLog : "triggers"
    User ||--o{ RefreshToken : "owns"

    Ambulance ||--o{ Dispatch : "assigned to"
    Hospital ||--o{ Emergency : "destination"
    Emergency ||--o| Dispatch : "triggers"
    Emergency ||--o| Payment : "settles"
    Dispatch ||--o| Payment : "settles"

    User {
        string id PK
        string name
        string email UK
        string password
        string phone
        enum role "PATIENT | DRIVER | ADMIN"
        boolean isVerified
        boolean isSuspended
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    DriverProfile {
        string id PK
        string userId FK, UK
        string licenseNumber UK
        int experienceYears
        boolean isVerified
        boolean isAvailable
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    Ambulance {
        string id PK
        string driverId FK, UK
        string vehicleNumber UK
        enum vehicleType "ICU | OXYGEN | BASIC"
        enum status "AVAILABLE | BUSY | MAINTENANCE"
        float currentLat
        float currentLng
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    Hospital {
        string id PK
        string name
        string address
        string contactNumber
        float lat
        float lng
        int capacity
        int availableBeds
        boolean isAvailable
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    Emergency {
        string id PK
        string patientId FK
        string hospitalId FK
        string pickupLocation
        float pickupLat
        float pickupLng
        enum ambulanceType "ICU | OXYGEN | BASIC"
        enum urgencyLevel "CRITICAL | HIGH | MEDIUM | LOW"
        enum status "REQUESTED | SEARCHING | ASSIGNED | ACCEPTED | EN_ROUTE | ARRIVED | PICKED_UP | AT_HOSPITAL | COMPLETED | CANCELLED"
        string notes
        float estimatedFare
        float finalFare
        string cancellationReason
        datetime cancelledAt
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    Dispatch {
        string id PK
        string emergencyId FK, UK
        string ambulanceId FK
        string driverId FK
        enum status "PENDING | ACCEPTED | EN_ROUTE | ARRIVED | PICKED_UP | AT_HOSPITAL | COMPLETED | CANCELLED | REJECTED"
        datetime assignedAt
        datetime acceptedAt
        datetime enRouteAt
        datetime arrivedAt
        datetime pickedUpAt
        datetime atHospitalAt
        datetime completedAt
        datetime cancelledAt
        string cancellationReason
        datetime createdAt
        datetime updatedAt
    }

    Payment {
        string id PK
        string patientId FK
        string emergencyId FK, UK
        string dispatchId FK, UK
        string transactionId UK
        float amount
        string currency
        enum status "PENDING | PAID | FAILED | REFUNDED"
        string paymentMethod
        string stripePaymentIntentId UK
        string stripeClientSecret
        json gatewayResponse
        datetime paidAt
        datetime createdAt
        datetime updatedAt
    }

    RefreshToken {
        string id PK
        string userId FK
        string token UK
        datetime expiresAt
        boolean revoked
        datetime createdAt
        datetime updatedAt
    }

    AuditLog {
        string id PK
        string userId FK
        string action
        string entity
        string entityId
        json details
        string ipAddress
        string userAgent
        datetime createdAt
    }
```

---

## 🔄 Emergency Dispatch State Machine

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: Patient requests emergency
    REQUESTED --> ASSIGNED: Nearest available ambulance found & assigned
    REQUESTED --> SEARCHING: No ambulance in immediate radius
    SEARCHING --> ASSIGNED: Ambulance becomes available

    ASSIGNED --> ACCEPTED: Driver accepts dispatch
    ASSIGNED --> REJECTED: Driver rejects dispatch (Emergency resets to SEARCHING)
    REJECTED --> SEARCHING: System searches next nearest ambulance

    ACCEPTED --> EN_ROUTE: Driver starts driving to patient
    EN_ROUTE --> ARRIVED: Ambulance arrives at pickup location
    ARRIVED --> PICKED_UP: Patient onboarded into ambulance
    PICKED_UP --> AT_HOSPITAL: Ambulance arrives at destination hospital
    AT_HOSPITAL --> COMPLETED: Patient admitted & trip completed

    REQUESTED --> CANCELLED: Patient cancels (Permitted)
    ASSIGNED --> CANCELLED: Patient cancels (Permitted)
    ACCEPTED --> CANCELLED: Patient cancels (Permitted)

    EN_ROUTE --> [*]: Cancellation BLOCKED (400 Bad Request)
    COMPLETED --> [*]: Trip finished (Payment initiated)
```

---

## 🔒 Strict Role-Based Access Control (RBAC)

The system enforces **EXACTLY 3 core roles**:

| Role | Scope & Permissions |
| :--- | :--- |
| **`PATIENT`** | Request emergencies, view own profile & emergency status, cancel emergencies prior to `EN_ROUTE`, initiate and view own payments. |
| **`DRIVER`** | View & update own driver profile, toggle on/off-duty availability, view assigned ambulance, view & update assigned dispatch status sequentially, view own trip history. |
| **`ADMIN`** | Comprehensive oversight: manage users (suspend/unsuspend, promote roles), manage fleet (create, update, soft-delete ambulances), manage hospitals, view system-wide analytics, inspect immutable audit logs. |

> [!IMPORTANT]
> **Zero Public Privilege Escalation**: The `POST /api/v1/auth/register` route explicitly rejects any attempt to register with the `ADMIN` role (`403 Forbidden`). Only existing Admins can promote users to `ADMIN`.

---

## 🛠 Technology Stack

* **Runtime**: Node.js v24+ / v26+
* **Framework**: Express.js 5
* **Language**: TypeScript 5.9
* **ORM**: **Prisma 8 RC** (`@prisma/orm-postgres: 8.0.0-rc.8`, `prisma: 8.0.0-rc.10`)
* **Database**: PostgreSQL 16+
* **Cache**: Redis with in-memory fallback
* **Validation**: Zod 4
* **Security**: Helmet, CORS, Express Rate Limit, bcrypt password hashing (10 salt rounds), JWT access tokens (15m) + cryptographic random refresh tokens (7d)
* **Payment**: Stripe Payment Intents API + Signature-verified Webhooks
* **Testing**: Vitest + Supertest
* **API Documentation**: OpenAPI 3.0.3 + Swagger UI Express

---

## 📖 Interactive Swagger API Documentation

ResQPatient features a fully interactive, production-ready **Swagger UI** with real-world examples, validation schemas, and persistent authorization.

### 🌐 Accessing the Docs:
* **Live Production Server**: [https://resqpatient.onrender.com](https://resqpatient.onrender.com)
* **Live Interactive Swagger UI**: [https://resqpatient.onrender.com/docs](https://resqpatient.onrender.com/docs)
* **Live OpenAPI 3.0.3 Specification**: [https://resqpatient.onrender.com/docs.json](https://resqpatient.onrender.com/docs.json)
* **Local Development UI**: [http://localhost:3000/docs](http://localhost:3000/docs)

### 🔑 How to Authenticate & Test in Swagger:
1. Open [https://resqpatient.onrender.com/docs](https://resqpatient.onrender.com/docs) (or [http://localhost:3000/docs](http://localhost:3000/docs)) in your browser.
2. Navigate to the **Authentication** section and expand `POST /api/v1/auth/login`.
3. Click **Try it out** and execute with seed credentials (e.g. `admin@resqpatient.com` / `Admin@12345` or `patient1@resqpatient.com` / `Patient@12345`).
4. Copy the `accessToken` from the response.
5. Click the green **Authorize 🔓** button at the top right of the Swagger UI.
6. Enter `Bearer <your_token>` and click **Authorize**.
7. All protected endpoints (`/emergencies`, `/ambulances`, `/dispatches`, `/admin/*`, etc.) are now authorized and ready for live execution directly inside the browser!

---

## 📡 API Reference

### Health & Keep-Alive
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | API welcome check & documentation index |
| `GET` | `/ping` | Public | Lightweight heartbeat endpoint to prevent Render sleep |
| `GET` | `/api/v1/health` | Public | System status and database connectivity check |
| `GET` | `/api/v1/health/ping` | Public | Fast health-probe pong response |

### Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register a new user (`PATIENT` or `DRIVER`) |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user; returns JWT + Refresh Token |
| `POST` | `/api/v1/auth/google` | Public | Google OAuth login / token exchange |
| `POST` | `/api/v1/auth/refresh-token` | Public | Rotate refresh token and issue new access token |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke refresh token and invalidate session |

### Users
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | Authenticated | Get current authenticated user profile |
| `PATCH` | `/api/v1/users/me` | Authenticated | Update current user name or phone number |
| `PATCH` | `/api/v1/users/me/password` | Authenticated | Update account password with old password verification |

### Drivers
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/drivers/me` | `DRIVER` | Get driver profile and assigned vehicle details |
| `PATCH` | `/api/v1/drivers/me` | `DRIVER` | Update driver license or experience years |
| `PATCH` | `/api/v1/drivers/me/availability`| `DRIVER` | Toggle driver available/unavailable status |
| `GET` | `/api/v1/drivers/me/trips` | `DRIVER` | View paginated driver trip history |

### Ambulances
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ambulances` | `ADMIN` | Register a new ambulance in the fleet |
| `GET` | `/api/v1/ambulances` | Authenticated | List ambulances with optional filters (`status`, `type`) |
| `GET` | `/api/v1/ambulances/:id` | Authenticated | Get specific ambulance details |
| `PATCH` | `/api/v1/ambulances/:id` | `ADMIN` | Update ambulance details |
| `DELETE`| `/api/v1/ambulances/:id` | `ADMIN` | Soft delete an ambulance |
| `PATCH` | `/api/v1/ambulances/:id/status`| `ADMIN`, `DRIVER` | Update ambulance status (`AVAILABLE`, `BUSY`, etc.) |
| `PATCH` | `/api/v1/ambulances/:id/location`| `ADMIN`, `DRIVER` | Update GPS coordinates (`lat`, `lng`) |
| `GET` | `/api/v1/ambulances/nearby` | Authenticated | Haversine proximity search for ambulances |

### Hospitals
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/hospitals` | `ADMIN` | Register a new hospital facility |
| `GET` | `/api/v1/hospitals` | Authenticated | List all hospitals (Redis cached) |
| `GET` | `/api/v1/hospitals/:id` | Authenticated | Get hospital details |
| `PATCH` | `/api/v1/hospitals/:id` | `ADMIN` | Update hospital capacity and beds |
| `DELETE`| `/api/v1/hospitals/:id` | `ADMIN` | Soft delete a hospital |
| `GET` | `/api/v1/hospitals/nearby` | Authenticated | Find nearby hospitals by distance |

### Emergencies & Dispatches
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/emergencies` | `PATIENT` | Request emergency & auto-dispatch nearest ambulance |
| `GET` | `/api/v1/emergencies` | Authenticated | View emergencies (Patients view own; Admins view all) |
| `GET` | `/api/v1/emergencies/:id` | Authenticated | Get emergency details |
| `PATCH` | `/api/v1/emergencies/:id/cancel`| `PATIENT`, `ADMIN` | Cancel emergency (blocked if `EN_ROUTE` or later) |
| `GET` | `/api/v1/dispatches` | `DRIVER`, `ADMIN` | View dispatches (Drivers view own; Admins view all) |
| `GET` | `/api/v1/dispatches/:id` | `DRIVER`, `ADMIN` | Get dispatch details |
| `POST` | `/api/v1/dispatches/:id/accept` | `DRIVER` | Driver accepts assigned dispatch |
| `POST` | `/api/v1/dispatches/:id/reject` | `DRIVER` | Driver rejects dispatch (resets emergency to `SEARCHING`) |
| `PATCH` | `/api/v1/dispatches/:id/status` | `DRIVER` | Update lifecycle state sequentially |

### Payments
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments/initiate` | `PATIENT` | Create Stripe PaymentIntent for completed trip |
| `GET` | `/api/v1/payments/:id` | Authenticated | Get payment record details |
| `GET` | `/api/v1/payments/my` | `PATIENT` | View patient's personal payment history |
| `POST` | `/api/v1/payments/webhook` | Public / Stripe | Stripe signature-verified idempotent webhook handler |

### Admin Moderation & Audit
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/users` | `ADMIN` | Paginated user management table with status filters |
| `PATCH` | `/api/v1/admin/users/:id/status` | `ADMIN` | Suspend or unsuspend a user account |
| `PATCH` | `/api/v1/admin/users/:id/role` | `ADMIN` | Promote or reassign user role |
| `GET` | `/api/v1/admin/statistics` | `ADMIN` | Platform metrics & KPIs (Redis cached) |
| `GET` | `/api/v1/admin/audit-logs` | `ADMIN` | Searchable, immutable platform audit trail |

---

## 💻 Installation & Local Setup

### Prerequisites

* Node.js v24+
* pnpm v10+ (or npm / yarn)
* PostgreSQL 16+ instance
* (Optional) Redis instance (in-memory fallback active if absent)

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/your-org/resqpatient-backend-project.git
cd resqpatient-backend-project
pnpm install
```

### Step 2: Configure Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Ensure your `.env` has valid credentials:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgres://postgres:password@localhost:5432/resqpatient?sslmode=disable"

# JWT
JWT_SECRET="super-secret-jwt-key-2026"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="super-secret-refresh-key-2026"
JWT_REFRESH_EXPIRES_IN="7d"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Redis
REDIS_URL="redis://localhost:6379"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
```

---

## ⚡ Prisma 8 RC Workflows

This project utilizes **Prisma 8 RC (Contract-First)** with `@prisma/orm-postgres`.

> [!CAUTION]
> **DO NOT downgrade Prisma to versions 6 or 7.** Do NOT use `prisma generate` or `prisma migrate dev`.

### 1. Emit Contract Files

When modifying `src/prisma/contract.prisma`, compile the PSL schema into TypeScript definitions and runtime contract:

```bash
pnpm prisma contract emit
```

### 2. Initialize / Synchronize Database

Synchronize your PostgreSQL database with the emitted contract:

```bash
pnpm prisma db init
```

---

## 🌱 Database Seeding & Default Credentials

Execute the automated database seeder to provision realistic initial data:

```bash
pnpm seed
```

### Pre-configured Seed Accounts

| Account Role | Email Address | Password | Details |
| :--- | :--- | :--- | :--- |
| **`ADMIN`** | `admin@resqpatient.com` | `Admin@12345` | Super Admin with full system privileges |
| **`PATIENT`** | `patient1@resqpatient.com` | `Patient@12345` | Verified Patient with emergency history |
| **`PATIENT`** | `patient2@resqpatient.com` | `Patient@12345` | Verified Patient |
| **`DRIVER`** | `driver1@resqpatient.com` | `Driver@12345` | Assigned to ICU Ambulance `AMB-ICU-101` |
| **`DRIVER`** | `driver2@resqpatient.com` | `Driver@12345` | Assigned to Oxygen Ambulance `AMB-OXY-201` |

---

## 🧪 Testing

The backend includes an exhaustive integration test suite verifying authentication, strict RBAC authorization, nearest ambulance geospatial dispatch, lifecycle state machine progression, server-side fare calculation, and idempotent Stripe payment processing.

Run all 22 integration tests:

```bash
pnpm test
```

Build the TypeScript project to verify type safety:

```bash
pnpm build
```

---

## 📮 Postman Collection

A complete Postman collection is included in the project root:

```text
ResQPatient.postman_collection.json
```

### How to use:
1. Open Postman $\rightarrow$ Click **Import** $\rightarrow$ Select `ResQPatient.postman_collection.json`.
2. The collection includes pre-configured collection variables (`baseUrl`, `patientToken`, `driverToken`, `adminToken`).
3. Running the **01. Authentication / Login - Admin** request automatically extracts the JWT and stores it in `adminToken`.
4. Running **01. Authentication / Login - Patient** automatically stores `patientToken`.
5. Running **01. Authentication / Login - Driver** automatically stores `driverToken`.
6. Requests across all 8 folders are chained dynamically with response tests.

---

## 🚀 Production Deployment Guide

### Recommended Infrastructure

* **Container Engine**: Docker + Kubernetes / AWS ECS / Google Cloud Run
* **Database**: Managed PostgreSQL (AWS RDS, Supabase, Neon, or Railway)
* **Cache**: Managed Redis (AWS ElastiCache, Upstash, or Redis Cloud)
* **Reverse Proxy**: NGINX / Cloudflare with TLS 1.3 termination

### Dockerfile (Sample Production Setup)

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma contract emit
RUN pnpm build

# Stage 2: Production Runner
FROM node:24-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prisma/contract.json ./dist/prisma/contract.json

USER node
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
```

### Production Checklist

- [x] Set strong, randomly generated secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- [x] Configure live Stripe API keys (`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`).
- [x] Connect Redis instance for caching and cluster scalability.
- [x] Enable SSL mode for PostgreSQL (`sslmode=require` or `sslmode=verify-full`).
- [x] Verify rate limiters and CORS origins for frontend domain lockdown.
- [x] Review immutable audit logs periodically for anomaly detection.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
