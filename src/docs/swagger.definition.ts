export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "ResQPatient API 🚑",
    version: "1.0.0",
    description: `
## Emergency Ambulance Dispatch & Response Platform

Welcome to the interactive **ResQPatient API** documentation.

### 🌟 Key Platform Highlights:
* **Real-time Proximity Dispatch**: Automatic nearest ambulance matching via Haversine distance.
* **Deterministic Server-Side Fare Calculation**: Transparent fare formula taking base fare, distance, vehicle tier (Basic, Oxygen, ICU), and urgency level into account.
* **Strict Sequential State Machine**: \`REQUESTED\` ➔ \`ASSIGNED\` ➔ \`ACCEPTED\` ➔ \`EN_ROUTE\` ➔ \`ARRIVED\` ➔ \`PICKED_UP\` ➔ \`AT_HOSPITAL\` ➔ \`COMPLETED\`.
* **Strict Cancellation Guard**: Emergency cancellation is strictly prohibited once the ambulance is \`EN_ROUTE\` or beyond.
* **Stripe Payments**: Automated payment intent initiation and webhook idempotency processing.
* **Redis Caching**: Sub-millisecond read latency with zero-crash automatic in-memory fallback.
* **Immutable Audit Trail**: Security-grade logging of every critical operation with IP and User-Agent tracking.

### 🔐 Authentication & Roles:
This API implements strict Role-Based Access Control (RBAC) with **EXACTLY 3 Roles**:
* **\`PATIENT\`**: Requests emergencies, views own medical trips, cancels before dispatch en-route, manages payments.
* **\`DRIVER\`**: Manages on-duty availability, views assigned ambulance, accepts/rejects dispatches, transitions trip status sequentially.
* **\`ADMIN\`**: Full platform oversight, ambulance fleet management, hospital facility administration, user moderation, analytics, and audit inspection.

> To test protected endpoints, log in via **Authentication > /api/v1/auth/login**, copy the \`accessToken\`, click the **Authorize 🔓** button at the top right, and enter \`Bearer <your_token>\`.
`,
    contact: {
      name: "ResQPatient Engineering Team",
      email: "support@resqpatient.com",
      url: "https://resqpatient.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Development Server",
    },
    {
      url: "https://api.resqpatient.com",
      description: "Production Server",
    },
  ],
  tags: [
    { name: "Health", description: "System status & database health probe" },
    { name: "Authentication", description: "Registration, JWT login, token rotation, Google OAuth, and logout" },
    { name: "Users", description: "Current user profile management & credential updates" },
    { name: "Drivers", description: "Driver profile, on-duty availability toggle, and trip history" },
    { name: "Ambulances", description: "Fleet management, GPS tracking, and Haversine geospatial proximity search" },
    { name: "Hospitals", description: "Hospital facilities, bed capacity, and proximity discovery" },
    { name: "Emergencies", description: "Patient emergency request, automatic dispatch assignment, and cancellation" },
    { name: "Dispatches", description: "Driver dispatch workflow & sequential lifecycle state transitions" },
    { name: "Payments", description: "Stripe PaymentIntents, patient payment receipts, and webhook handler" },
    { name: "Admin", description: "User moderation, role promotion, system metrics, and immutable audit trail" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token obtained from `/api/v1/auth/login` or `/api/v1/auth/register`.",
      },
    },
    schemas: {
      StandardResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          statusCode: { type: "integer", example: 200 },
          message: { type: "string", example: "Operation executed successfully" },
          data: { type: "object" },
        },
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          statusCode: { type: "integer", example: 200 },
          message: { type: "string", example: "Records retrieved successfully" },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 10 },
              total: { type: "integer", example: 42 },
              totalPage: { type: "integer", example: 5 },
            },
          },
          data: { type: "array", items: { type: "object" } },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error description" },
          errorSources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string", example: "email" },
                message: { type: "string", example: "Invalid email address format" },
              },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "e2b58839-8664-4bf8-b80c-7bbfeb24f0a1" },
          name: { type: "string", example: "John Doe" },
          email: { type: "string", format: "email", example: "patient1@resqpatient.com" },
          phone: { type: "string", example: "+1-555-0101" },
          role: { type: "string", enum: ["PATIENT", "DRIVER", "ADMIN"], example: "PATIENT" },
          isVerified: { type: "boolean", example: true },
          isSuspended: { type: "boolean", example: false },
          createdAt: { type: "string", format: "date-time", example: "2026-09-04T12:00:00.000Z" },
          updatedAt: { type: "string", format: "date-time", example: "2026-09-04T12:00:00.000Z" },
        },
      },
      DriverProfile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "b9c0c80b-9dfc-473d-88f6-281df6f8ec47" },
          userId: { type: "string", format: "uuid", example: "8d94e246-0b89-490c-b262-6ad02eb6b5c3" },
          licenseNumber: { type: "string", example: "DL-NYC-1001" },
          experienceYears: { type: "integer", example: 5 },
          isVerified: { type: "boolean", example: true },
          isAvailable: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time", example: "2026-09-04T12:00:00.000Z" },
        },
      },
      Ambulance: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "7c5e2d1a-4712-4a0b-9a84-f3c9594dbcb1" },
          driverId: { type: "string", format: "uuid", nullable: true, example: "8d94e246-0b89-490c-b262-6ad02eb6b5c3" },
          vehicleNumber: { type: "string", example: "AMB-ICU-101" },
          vehicleType: { type: "string", enum: ["ICU", "OXYGEN", "BASIC"], example: "ICU" },
          status: { type: "string", enum: ["AVAILABLE", "BUSY", "MAINTENANCE"], example: "AVAILABLE" },
          currentLat: { type: "number", format: "float", example: 40.7128 },
          currentLng: { type: "number", format: "float", example: -74.006 },
          createdAt: { type: "string", format: "date-time", example: "2026-09-04T12:00:00.000Z" },
        },
      },
      Hospital: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "fa1b8c2e-436d-4959-bc3d-89025178659b" },
          name: { type: "string", example: "New York Presbyterian Emergency Center" },
          address: { type: "string", example: "525 E 68th St, New York, NY 10065" },
          contactNumber: { type: "string", example: "+1-212-746-5454" },
          lat: { type: "number", format: "float", example: 40.7648 },
          lng: { type: "number", format: "float", example: -73.9542 },
          capacity: { type: "integer", example: 250 },
          availableBeds: { type: "integer", example: 45 },
          isAvailable: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time", example: "2026-09-04T12:00:00.000Z" },
        },
      },
      Emergency: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "9b9adbf4-5264-42f5-b3a5-bcddfb27bfe1" },
          patientId: { type: "string", format: "uuid", example: "e2b58839-8664-4bf8-b80c-7bbfeb24f0a1" },
          hospitalId: { type: "string", format: "uuid", example: "fa1b8c2e-436d-4959-bc3d-89025178659b" },
          pickupLocation: { type: "string", example: "Wall St & Broadway, New York, NY" },
          pickupLat: { type: "number", format: "float", example: 40.7071 },
          pickupLng: { type: "number", format: "float", example: -74.011 },
          ambulanceType: { type: "string", enum: ["ICU", "OXYGEN", "BASIC"], example: "ICU" },
          urgencyLevel: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"], example: "CRITICAL" },
          status: {
            type: "string",
            enum: ["REQUESTED", "SEARCHING", "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "PICKED_UP", "AT_HOSPITAL", "COMPLETED", "CANCELLED"],
            example: "ASSIGNED",
          },
          notes: { type: "string", nullable: true, example: "Patient experiencing chest pain and shortness of breath" },
          estimatedFare: { type: "number", format: "float", example: 125.5 },
          finalFare: { type: "number", format: "float", nullable: true, example: 125.5 },
          cancellationReason: { type: "string", nullable: true, example: null },
          cancelledAt: { type: "string", format: "date-time", nullable: true, example: null },
          createdAt: { type: "string", format: "date-time", example: "2026-09-04T12:00:00.000Z" },
        },
      },
      Dispatch: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "39dc089f-d3b2-4d11-b4f0-ec7b49463ae3" },
          emergencyId: { type: "string", format: "uuid", example: "9b9adbf4-5264-42f5-b3a5-bcddfb27bfe1" },
          ambulanceId: { type: "string", format: "uuid", example: "7c5e2d1a-4712-4a0b-9a84-f3c9594dbcb1" },
          driverId: { type: "string", format: "uuid", example: "8d94e246-0b89-490c-b262-6ad02eb6b5c3" },
          status: {
            type: "string",
            enum: ["PENDING", "ACCEPTED", "EN_ROUTE", "ARRIVED", "PICKED_UP", "AT_HOSPITAL", "COMPLETED", "CANCELLED", "REJECTED"],
            example: "PENDING",
          },
          assignedAt: { type: "string", format: "date-time", example: "2026-09-04T12:00:00.000Z" },
          acceptedAt: { type: "string", format: "date-time", nullable: true, example: null },
          enRouteAt: { type: "string", format: "date-time", nullable: true, example: null },
          arrivedAt: { type: "string", format: "date-time", nullable: true, example: null },
          pickedUpAt: { type: "string", format: "date-time", nullable: true, example: null },
          atHospitalAt: { type: "string", format: "date-time", nullable: true, example: null },
          completedAt: { type: "string", format: "date-time", nullable: true, example: null },
        },
      },
      Payment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "e102bc45-e63d-4958-8549-fa0819231f24" },
          patientId: { type: "string", format: "uuid", example: "e2b58839-8664-4bf8-b80c-7bbfeb24f0a1" },
          emergencyId: { type: "string", format: "uuid", example: "9b9adbf4-5264-42f5-b3a5-bcddfb27bfe1" },
          dispatchId: { type: "string", format: "uuid", example: "39dc089f-d3b2-4d11-b4f0-ec7b49463ae3" },
          transactionId: { type: "string", example: "TXN-1725451200-48201" },
          amount: { type: "number", format: "float", example: 125.5 },
          currency: { type: "string", example: "usd" },
          status: { type: "string", enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], example: "PAID" },
          paymentMethod: { type: "string", example: "card" },
          stripePaymentIntentId: { type: "string", example: "pi_3MtwBwLkdIwHu7ix28a3tqPa" },
          stripeClientSecret: { type: "string", example: "pi_3MtwBwLkdIwHu7ix28a3tqPa_secret_kjd923j" },
          paidAt: { type: "string", format: "date-time", nullable: true, example: "2026-09-04T12:45:00.000Z" },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "a4c28f11-0e62-4217-b769-cf2b01235abc" },
          userId: { type: "string", format: "uuid", nullable: true, example: "e2b58839-8664-4bf8-b80c-7bbfeb24f0a1" },
          action: { type: "string", example: "EMERGENCY_CREATED" },
          entity: { type: "string", example: "Emergency" },
          entityId: { type: "string", example: "9b9adbf4-5264-42f5-b3a5-bcddfb27bfe1" },
          details: { type: "object", example: { pickupLocation: "Wall St", urgency: "CRITICAL" } },
          ipAddress: { type: "string", example: "127.0.0.1" },
          userAgent: { type: "string", example: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
          createdAt: { type: "string", format: "date-time", example: "2026-09-04T12:00:00.000Z" },
        },
      },
    },
  },
  paths: {
    "/": {
      get: {
        tags: ["Health"],
        summary: "Root Welcome Probe",
        description: "Returns an introduction message confirming the ResQPatient service is running.",
        responses: {
          200: {
            description: "Service is online",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Welcome to ResQPatient Backend API 🚑" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/health": {
      get: {
        tags: ["Health"],
        summary: "System Health & PostgreSQL Probe",
        description: "Checks API availability, database connection health, and current server timestamp.",
        responses: {
          200: {
            description: "System healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "ResQPatient service is healthy" },
                    data: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "healthy" },
                        uptime: { type: "number", example: 1245.8 },
                        timestamp: { type: "string", format: "date-time", example: "2026-09-04T12:00:00.000Z" },
                        database: { type: "string", example: "connected" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register New User (Patient or Driver)",
        description: `
Registers a new \`PATIENT\` or \`DRIVER\` account.
> **Security Notice**: Public registration strictly blocks \`ADMIN\` role assignment (\`403 Forbidden\`).
When registering as a \`DRIVER\`, an unverified \`DriverProfile\` is automatically provisioned.
        `,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Sarah Connor" },
                  email: { type: "string", format: "email", example: "sarah.connor@example.com" },
                  password: { type: "string", format: "password", example: "Password@12345", description: "Minimum 6 characters" },
                  phone: { type: "string", example: "+1-555-0988" },
                  role: { type: "string", enum: ["PATIENT", "DRIVER"], default: "PATIENT", example: "PATIENT" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 201 },
                    message: { type: "string", example: "User registered successfully" },
                    data: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error or invalid input format", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Attempted to register with ADMIN role", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          409: { description: "Email address already registered", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login with Email & Password",
        description: "Authenticates credentials and returns a short-lived Access Token (15m) and a secure Refresh Token (7d).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "patient1@resqpatient.com" },
                  password: { type: "string", format: "password", example: "Patient@12345" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Authentication successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "Login successful" },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                        refreshToken: { type: "string", example: "d9a3b8c7128ef8109283f98273b..." },
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Invalid email or password", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          403: { description: "Account is suspended", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/auth/google": {
      post: {
        tags: ["Authentication"],
        summary: "Google OAuth 2.0 Sign In",
        description: "Validates a Google ID token. If the user does not exist, an account is automatically created with the requested role.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["idToken"],
                properties: {
                  idToken: { type: "string", example: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFhNmQ..." },
                  role: { type: "string", enum: ["PATIENT", "DRIVER"], default: "PATIENT", example: "PATIENT" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Google authentication successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "Google login successful" },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
                        refreshToken: { type: "string", example: "f7c9e012..." },
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid Google ID token", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/auth/refresh-token": {
      post: {
        tags: ["Authentication"],
        summary: "Rotate Refresh Token",
        description: "Exchanges a valid refresh token for a brand-new access token and rotated refresh token. The previous token is revoked immediately.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: { type: "string", example: "d9a3b8c7128ef8109283f98273b..." },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Tokens rotated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "Token refreshed successfully" },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
                        refreshToken: { type: "string", example: "a4f109283..." },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Invalid, expired, or revoked refresh token", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout & Revoke Refresh Token",
        description: "Revokes the supplied refresh token so it cannot be used to generate new access tokens.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: { type: "string", example: "d9a3b8c7128ef8109283f98273b..." },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "Logged out successfully" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get Current User Profile",
        security: [{ bearerAuth: [] }],
        description: "Returns the authenticated user's profile and linked driver profile (if driver).",
        responses: {
          200: {
            description: "Profile retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "User profile retrieved successfully" },
                    data: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update Profile Details",
        security: [{ bearerAuth: [] }],
        description: "Allows the authenticated user to update their display name and contact phone number.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "John Alexander Doe" },
                  phone: { type: "string", example: "+1-555-9988" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "User profile updated successfully" },
                    data: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid payload format" },
        },
      },
    },
    "/api/v1/users/me/password": {
      patch: {
        tags: ["Users"],
        summary: "Change Account Password",
        security: [{ bearerAuth: [] }],
        description: "Changes the authenticated user's password after verifying their old password.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["oldPassword", "newPassword"],
                properties: {
                  oldPassword: { type: "string", format: "password", example: "Patient@12345" },
                  newPassword: { type: "string", format: "password", example: "Patient@NewPass123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "Password updated successfully" },
                  },
                },
              },
            },
          },
          400: { description: "Incorrect current password or invalid new password format" },
        },
      },
    },
    "/api/v1/drivers/me": {
      get: {
        tags: ["Drivers"],
        summary: "Get Driver Profile & Assigned Ambulance",
        security: [{ bearerAuth: [] }],
        description: "Returns the driver's verification status, license info, and current assigned vehicle.",
        responses: {
          200: {
            description: "Driver profile retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "Driver profile retrieved successfully" },
                    data: {
                      allOf: [
                        { $ref: "#/components/schemas/DriverProfile" },
                        {
                          type: "object",
                          properties: {
                            ambulance: { $ref: "#/components/schemas/Ambulance" },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden: Driver role required" },
        },
      },
      patch: {
        tags: ["Drivers"],
        summary: "Update Driver Profile",
        security: [{ bearerAuth: [] }],
        description: "Allows the driver to update their license number or years of experience.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  licenseNumber: { type: "string", example: "DL-NYC-9099" },
                  experienceYears: { type: "integer", example: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Driver profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "Driver profile updated successfully" },
                    data: { $ref: "#/components/schemas/DriverProfile" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/drivers/me/availability": {
      patch: {
        tags: ["Drivers"],
        summary: "Toggle Driver On-Duty Availability",
        security: [{ bearerAuth: [] }],
        description: "Switches the driver between available (ready for dispatch) and unavailable (off-duty).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["isAvailable"],
                properties: {
                  isAvailable: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Availability status updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "Driver availability updated successfully" },
                    data: { $ref: "#/components/schemas/DriverProfile" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/drivers/me/trips": {
      get: {
        tags: ["Drivers"],
        summary: "Get Driver Paginated Trip History",
        security: [{ bearerAuth: [] }],
        description: "Returns a paginated list of all dispatches handled by this driver.",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["COMPLETED", "ACCEPTED", "CANCELLED"] } },
        ],
        responses: {
          200: {
            description: "Trips retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/ambulances": {
      post: {
        tags: ["Ambulances"],
        summary: "Create New Ambulance (Admin)",
        security: [{ bearerAuth: [] }],
        description: "Registers a new ambulance in the platform fleet with initial coordinates.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["vehicleNumber", "vehicleType"],
                properties: {
                  vehicleNumber: { type: "string", example: "AMB-ICU-990" },
                  vehicleType: { type: "string", enum: ["ICU", "OXYGEN", "BASIC"], example: "ICU" },
                  driverId: { type: "string", format: "uuid", nullable: true, example: null },
                  currentLat: { type: "number", format: "float", example: 40.7128 },
                  currentLng: { type: "number", format: "float", example: -74.006 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Ambulance created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 201 },
                    message: { type: "string", example: "Ambulance created successfully" },
                    data: { $ref: "#/components/schemas/Ambulance" },
                  },
                },
              },
            },
          },
          403: { description: "Forbidden: Admin role required" },
          409: { description: "Vehicle number already registered" },
        },
      },
      get: {
        tags: ["Ambulances"],
        summary: "List Ambulances",
        security: [{ bearerAuth: [] }],
        description: "Returns a paginated list of ambulances with optional status and vehicle type filters.",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["AVAILABLE", "BUSY", "MAINTENANCE"] } },
          { name: "vehicleType", in: "query", schema: { type: "string", enum: ["ICU", "OXYGEN", "BASIC"] } },
        ],
        responses: {
          200: {
            description: "Ambulances retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/ambulances/nearby": {
      get: {
        tags: ["Ambulances"],
        summary: "Find Nearby Ambulances (Haversine Geo Search)",
        security: [{ bearerAuth: [] }],
        description: "Computes spherical distance from supplied GPS coordinates and returns available ambulances within specified radius.",
        parameters: [
          { name: "lat", in: "query", required: true, schema: { type: "number", format: "float", example: 40.7128 } },
          { name: "lng", in: "query", required: true, schema: { type: "number", format: "float", example: -74.006 } },
          { name: "radius", in: "query", schema: { type: "number", default: 25, example: 20 }, description: "Search radius in kilometers" },
          { name: "type", in: "query", schema: { type: "string", enum: ["ICU", "OXYGEN", "BASIC"] } },
        ],
        responses: {
          200: {
            description: "Nearby ambulances sorted by distance (ascending)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "Nearby ambulances retrieved successfully" },
                    data: {
                      type: "array",
                      items: {
                        allOf: [
                          { $ref: "#/components/schemas/Ambulance" },
                          {
                            type: "object",
                            properties: {
                              distanceKm: { type: "number", format: "float", example: 2.34 },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/ambulances/{id}": {
      get: {
        tags: ["Ambulances"],
        summary: "Get Ambulance by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: {
            description: "Ambulance details",
            content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } },
          },
          404: { description: "Ambulance not found" },
        },
      },
      patch: {
        tags: ["Ambulances"],
        summary: "Update Ambulance Details (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  vehicleType: { type: "string", enum: ["ICU", "OXYGEN", "BASIC"] },
                  driverId: { type: "string", format: "uuid", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Ambulance updated" },
          403: { description: "Forbidden" },
        },
      },
      delete: {
        tags: ["Ambulances"],
        summary: "Soft Delete Ambulance (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Ambulance soft deleted successfully" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/v1/ambulances/{id}/status": {
      patch: {
        tags: ["Ambulances"],
        summary: "Update Ambulance Fleet Status",
        security: [{ bearerAuth: [] }],
        description: "Updates ambulance operational status. Accessible to Admins and the assigned Driver.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["AVAILABLE", "BUSY", "MAINTENANCE"], example: "AVAILABLE" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Status updated successfully" },
        },
      },
    },
    "/api/v1/ambulances/{id}/location": {
      patch: {
        tags: ["Ambulances"],
        summary: "Update Ambulance GPS Coordinates",
        security: [{ bearerAuth: [] }],
        description: "Broadcasts latest telemetry coordinates. Accessible to Admins and the assigned Driver.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentLat", "currentLng"],
                properties: {
                  currentLat: { type: "number", format: "float", example: 40.7135 },
                  currentLng: { type: "number", format: "float", example: -74.007 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Coordinates updated successfully" },
        },
      },
    },
    "/api/v1/hospitals": {
      post: {
        tags: ["Hospitals"],
        summary: "Register New Hospital Facility (Admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "address", "contactNumber", "lat", "lng"],
                properties: {
                  name: { type: "string", example: "Bellevue Hospital Center" },
                  address: { type: "string", example: "462 1st Ave, New York, NY 10016" },
                  contactNumber: { type: "string", example: "+1-212-562-4141" },
                  lat: { type: "number", format: "float", example: 40.7392 },
                  lng: { type: "number", format: "float", example: -73.9754 },
                  capacity: { type: "integer", example: 844 },
                  availableBeds: { type: "integer", example: 120 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Hospital facility registered" },
          403: { description: "Forbidden" },
        },
      },
      get: {
        tags: ["Hospitals"],
        summary: "List Hospitals (Cached)",
        security: [{ bearerAuth: [] }],
        description: "Returns paginated hospitals. Cached in Redis for high read throughput.",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Hospitals retrieved successfully" },
        },
      },
    },
    "/api/v1/hospitals/nearby": {
      get: {
        tags: ["Hospitals"],
        summary: "Find Nearby Hospitals by Distance",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "lat", in: "query", required: true, schema: { type: "number", format: "float", example: 40.7128 } },
          { name: "lng", in: "query", required: true, schema: { type: "number", format: "float", example: -74.006 } },
          { name: "radius", in: "query", schema: { type: "number", default: 20 } },
        ],
        responses: {
          200: { description: "Nearby hospitals sorted by proximity" },
        },
      },
    },
    "/api/v1/hospitals/{id}": {
      get: {
        tags: ["Hospitals"],
        summary: "Get Hospital by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Hospital details" },
          404: { description: "Hospital not found" },
        },
      },
      patch: {
        tags: ["Hospitals"],
        summary: "Update Hospital Details (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  availableBeds: { type: "integer", example: 35 },
                  isAvailable: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Hospital updated" },
        },
      },
      delete: {
        tags: ["Hospitals"],
        summary: "Soft Delete Hospital (Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Hospital deleted successfully" },
        },
      },
    },
    "/api/v1/emergencies": {
      post: {
        tags: ["Emergencies"],
        summary: "Request Emergency & Auto-Dispatch Ambulance",
        security: [{ bearerAuth: [] }],
        description: `
Initiates an emergency request for the authenticated \`PATIENT\`.
* Computes deterministic fare server-side.
* Automatically queries nearest available ambulance matching the requested tier.
* Atomically assigns the unit and sets status to \`ASSIGNED\`.
* If no unit is immediately in range, sets status to \`SEARCHING\`.
        `,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["hospitalId", "pickupLocation", "pickupLat", "pickupLng", "ambulanceType"],
                properties: {
                  hospitalId: { type: "string", format: "uuid", example: "fa1b8c2e-436d-4959-bc3d-89025178659b" },
                  pickupLocation: { type: "string", example: "Broadway & Wall St, New York, NY" },
                  pickupLat: { type: "number", format: "float", example: 40.7071 },
                  pickupLng: { type: "number", format: "float", example: -74.011 },
                  ambulanceType: { type: "string", enum: ["ICU", "OXYGEN", "BASIC"], example: "ICU" },
                  urgencyLevel: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"], default: "MEDIUM", example: "CRITICAL" },
                  notes: { type: "string", example: "Severe cardiac symptoms" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Emergency created and ambulance assigned",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 201 },
                    message: { type: "string", example: "Emergency requested successfully" },
                    data: {
                      allOf: [
                        { $ref: "#/components/schemas/Emergency" },
                        {
                          type: "object",
                          properties: {
                            dispatch: { $ref: "#/components/schemas/Dispatch" },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid hospital or coordinate bounds" },
        },
      },
      get: {
        tags: ["Emergencies"],
        summary: "List Emergencies",
        security: [{ bearerAuth: [] }],
        description: "Patients view their own emergencies; Admins view all platform emergencies.",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["REQUESTED", "ASSIGNED", "ACCEPTED", "EN_ROUTE", "COMPLETED", "CANCELLED"] } },
        ],
        responses: {
          200: { description: "Emergencies retrieved successfully" },
        },
      },
    },
    "/api/v1/emergencies/{id}": {
      get: {
        tags: ["Emergencies"],
        summary: "Get Emergency Details",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Emergency details" },
          404: { description: "Emergency not found" },
        },
      },
    },
    "/api/v1/emergencies/{id}/cancel": {
      patch: {
        tags: ["Emergencies"],
        summary: "Cancel Emergency (Protected State Guard)",
        security: [{ bearerAuth: [] }],
        description: `
Cancels an emergency.
> **Critical Rule**: Cancellation is **strictly rejected with 400 Bad Request** once the ambulance status is \`EN_ROUTE\` or beyond.
        `,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", example: "Family member drove patient instead." },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Emergency cancelled and ambulance released back to AVAILABLE" },
          400: { description: "Cannot cancel once ambulance is EN_ROUTE or later" },
          403: { description: "You are not authorized to cancel this emergency" },
        },
      },
    },
    "/api/v1/dispatches": {
      get: {
        tags: ["Dispatches"],
        summary: "List Dispatches",
        security: [{ bearerAuth: [] }],
        description: "Drivers view their own assigned dispatches; Admins view all fleet dispatches.",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Dispatches retrieved successfully" },
        },
      },
    },
    "/api/v1/dispatches/{id}": {
      get: {
        tags: ["Dispatches"],
        summary: "Get Dispatch Details",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Dispatch details" },
          404: { description: "Dispatch not found" },
        },
      },
    },
    "/api/v1/dispatches/{id}/accept": {
      post: {
        tags: ["Dispatches"],
        summary: "Driver Accepts Assigned Dispatch",
        security: [{ bearerAuth: [] }],
        description: "Driver accepts the pending dispatch. Moves dispatch and emergency status to `ACCEPTED`.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Dispatch accepted successfully" },
          400: { description: "Dispatch is not in PENDING state" },
          403: { description: "You are not the assigned driver" },
        },
      },
    },
    "/api/v1/dispatches/{id}/reject": {
      post: {
        tags: ["Dispatches"],
        summary: "Driver Rejects Dispatch",
        security: [{ bearerAuth: [] }],
        description: "Driver rejects the dispatch. Releases ambulance to AVAILABLE and resets emergency to SEARCHING for automatic reassignment.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", example: "Mechanical vehicle malfunction" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Dispatch rejected; emergency returned to search queue" },
        },
      },
    },
    "/api/v1/dispatches/{id}/status": {
      patch: {
        tags: ["Dispatches"],
        summary: "Sequential State Transition (Driver)",
        security: [{ bearerAuth: [] }],
        description: `
Enforces sequential state transitions:
* \`ACCEPTED\` ➔ \`EN_ROUTE\`
* \`EN_ROUTE\` ➔ \`ARRIVED\`
* \`ARRIVED\` ➔ \`PICKED_UP\`
* \`PICKED_UP\` ➔ \`AT_HOSPITAL\`
* \`AT_HOSPITAL\` ➔ \`COMPLETED\`

> Skipping states (e.g. from \`ACCEPTED\` straight to \`ARRIVED\`) is strictly rejected with **400 Bad Request**.
        `,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["ACCEPTED", "EN_ROUTE", "ARRIVED", "PICKED_UP", "AT_HOSPITAL", "COMPLETED"],
                    example: "EN_ROUTE",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "State transitioned successfully" },
          400: { description: "Invalid state transition or state skip" },
          403: { description: "You are not the assigned driver" },
        },
      },
    },
    "/api/v1/payments/initiate": {
      post: {
        tags: ["Payments"],
        summary: "Initiate Stripe Payment for Completed Trip",
        security: [{ bearerAuth: [] }],
        description: "Creates a Stripe PaymentIntent and returns the client secret for patient payment submission.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["emergencyId"],
                properties: {
                  emergencyId: { type: "string", format: "uuid", example: "9b9adbf4-5264-42f5-b3a5-bcddfb27bfe1" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "PaymentIntent initiated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 201 },
                    message: { type: "string", example: "Payment initiated successfully" },
                    data: {
                      type: "object",
                      properties: {
                        clientSecret: { type: "string", example: "pi_3MtwBwLkdIwHu7ix_secret_89234jh" },
                        payment: { $ref: "#/components/schemas/Payment" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Emergency is not completed or already paid" },
        },
      },
    },
    "/api/v1/payments/my": {
      get: {
        tags: ["Payments"],
        summary: "Get Patient Payment Receipts",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: {
          200: { description: "Patient payments retrieved" },
        },
      },
    },
    "/api/v1/payments/{id}": {
      get: {
        tags: ["Payments"],
        summary: "Get Payment Details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Payment details" },
          404: { description: "Payment record not found" },
        },
      },
    },
    "/api/v1/payments/webhook": {
      post: {
        tags: ["Payments"],
        summary: "Stripe Signature-Verified Webhook Handler",
        description: `
Receives raw webhook events from Stripe.
* Verifies \`stripe-signature\` header against configured webhook secret.
* Processes \`payment_intent.succeeded\` events idempotently.
* Replays of already completed payments return \`{ received: true, message: "Payment was already recorded as PAID (idempotent)." }\`.
        `,
        parameters: [
          { name: "stripe-signature", in: "header", required: true, schema: { type: "string", example: "t=1492774577,v1=5257a869e7ecebeda32affa62cd..." } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string", example: "evt_1MtwBwLkdIwHu7ix0y23" },
                  type: { type: "string", example: "payment_intent.succeeded" },
                  data: {
                    type: "object",
                    properties: {
                      object: {
                        type: "object",
                        properties: {
                          id: { type: "string", example: "pi_3MtwBwLkdIwHu7ix28a3tqPa" },
                          status: { type: "string", example: "succeeded" },
                          amount_received: { type: "integer", example: 12550 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Webhook processed successfully" },
          400: { description: "Invalid signature or malformed raw body" },
        },
      },
    },
    "/api/v1/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List Users (Admin Moderation)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "role", in: "query", schema: { type: "string", enum: ["PATIENT", "DRIVER", "ADMIN"] } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Users list for moderation" },
          403: { description: "Forbidden: Admin only" },
        },
      },
    },
    "/api/v1/admin/users/{id}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Suspend / Unsuspend User Account",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["isSuspended"],
                properties: {
                  isSuspended: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User suspension state updated" },
        },
      },
    },
    "/api/v1/admin/users/{id}/role": {
      patch: {
        tags: ["Admin"],
        summary: "Promote / Reassign User Role",
        security: [{ bearerAuth: [] }],
        description: "Allows Super Admins to promote a user to `ADMIN` or switch between `PATIENT` and `DRIVER`.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["PATIENT", "DRIVER", "ADMIN"], example: "ADMIN" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User role reassigned successfully" },
        },
      },
    },
    "/api/v1/admin/statistics": {
      get: {
        tags: ["Admin"],
        summary: "Platform Metrics & Real-time KPIs",
        security: [{ bearerAuth: [] }],
        description: "Returns platform metrics (total users, active fleet, emergency stats, revenue). Cached in Redis.",
        responses: {
          200: {
            description: "Platform statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    statusCode: { type: "integer", example: 200 },
                    message: { type: "string", example: "Platform statistics retrieved successfully" },
                    data: {
                      type: "object",
                      properties: {
                        users: {
                          type: "object",
                          properties: {
                            total: { type: "integer", example: 120 },
                            patients: { type: "integer", example: 95 },
                            drivers: { type: "integer", example: 20 },
                            admins: { type: "integer", example: 5 },
                          },
                        },
                        ambulances: {
                          type: "object",
                          properties: {
                            total: { type: "integer", example: 15 },
                            available: { type: "integer", example: 10 },
                            busy: { type: "integer", example: 4 },
                            maintenance: { type: "integer", example: 1 },
                          },
                        },
                        emergencies: {
                          type: "object",
                          properties: {
                            total: { type: "integer", example: 340 },
                            active: { type: "integer", example: 8 },
                            completed: { type: "integer", example: 312 },
                            cancelled: { type: "integer", example: 20 },
                          },
                        },
                        revenue: {
                          type: "object",
                          properties: {
                            totalAmount: { type: "number", example: 38450.75 },
                            currency: { type: "string", example: "usd" },
                          },
                        },
                        generatedAt: { type: "string", format: "date-time", example: "2026-09-04T12:00:00.000Z" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/admin/audit-logs": {
      get: {
        tags: ["Admin"],
        summary: "View Immutable Platform Audit Trail",
        security: [{ bearerAuth: [] }],
        description: "Returns paginated audit log entries with user, entity, IP address, and user-agent metadata.",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "entity", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Audit trail records retrieved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedResponse" },
              },
            },
          },
        },
      },
    },
  },
};
