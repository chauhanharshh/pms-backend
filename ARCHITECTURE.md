# System Architecture Overview - Multi-Hotel PMS

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Applications                    │
│         (React/Vue/Angular - Separate Project)              │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST API
                     │ JWT Bearer Token
┌────────────────────▼────────────────────────────────────────┐
│                    API Gateway / Load Balancer               │
│                         (Nginx/ALB)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   Node.js Backend (Express)                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Middleware Stack                           │  │
│  │  • Authentication (JWT)                               │  │
│  │  • Tenant Isolation                                   │  │
│  │  • Authorization Guards                               │  │
│  │  • Error Handler                                      │  │
│  │  • Logger (Pino)                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Modules                              │  │
│  │  • Auth         • Hotels        • Rooms               │  │
│  │  • Bookings     • Bills         • Invoices            │  │
│  │  • Expenses     • Advances      • Misc Charges        │  │
│  │  • Restaurant   • Reports       • Users               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Business Logic Layer                        │  │
│  │  • Service Classes                                    │  │
│  │  • Transaction Management                             │  │
│  │  • Validation (Zod)                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Data Access Layer                        │  │
│  │           Prisma ORM + Type Safety                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│                  (Multi-Tenant Schema)                       │
│                                                               │
│  • Hotels & Configuration                                    │
│  • Rooms & Inventory                                         │
│  • Bookings & Operations                                     │
│  • Financial Records (Bills/Invoices/Expenses)               │
│  • Restaurant POS Data                                       │
│  • Audit Trails                                              │
└───────────────────────────────────────────────────────────────┘
```

## 📦 Technology Stack

### Backend Framework
- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express.js
- **Architecture:** Clean Modular Architecture

### Database
- **Database:** PostgreSQL 14+
- **ORM:** Prisma
- **Features:** 
  - ACID Transactions
  - Connection Pooling
  - Type-safe queries
  - Automatic migrations

### Authentication & Security
- **Auth:** JWT (JSON Web Tokens)
- **Validation:** Zod schemas
- **Encryption:** bcrypt (password hashing)
- **Security:** Helmet.js
- **CORS:** Configurable origins

### Logging & Monitoring
- **Logger:** Pino (high-performance)
- **HTTP Logging:** pino-http
- **Format:** JSON structured logs

## 🔐 Security Architecture

### Authentication Flow
```
1. User sends credentials → /api/v1/auth/login
2. Server validates credentials
3. Generate JWT with user info:
   - userId
   - hotelId (if applicable)
   - role
4. Return token to client
5. Client includes token in subsequent requests:
   Authorization: Bearer <token>
```

### Authorization Levels
```
┌─────────────────────────────────────────────────────┐
│                      Admin                          │
│  • Access all hotels                                │
│  • Create/clone hotels                              │
│  • Override financial records                       │
│  • Manage all users                                 │
│  • View consolidated reports                        │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                 Hotel Manager                       │
│  • Access assigned hotel only                       │
│  • Manage hotel settings                            │
│  • Manage hotel staff                               │
│  • Full operational access                          │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                  Hotel User                         │
│  • Access assigned hotel only                       │
│  • Check-in/check-out                               │
│  • Create bookings                                  │
│  • Process payments                                 │
│  • Create POS orders                                │
└─────────────────────────────────────────────────────┘
```

## 🏢 Multi-Tenant Isolation

### Tenant Identification
```typescript
// Hotel users - automatic filtering
req.user.hotelId → automatically filters all queries

// Admin - flexible access
No hotelId → sees all hotels
X-Hotel-ID header → filters to specific hotel
hotelId query param → filters to specific hotel
```

### Database-Level Isolation
Every query is automatically filtered:
```sql
-- Hotel user query
SELECT * FROM bookings WHERE hotel_id = 'user-hotel-id';

-- Admin with context
SELECT * FROM bookings WHERE hotel_id = 'specified-hotel-id';

-- Admin without context
SELECT * FROM bookings; -- All hotels
```

## 📊 Data Flow

### Booking Lifecycle
```
1. RESERVATION
   ├── Create booking record (status: confirmed)
   ├── Validate room availability
   └── Store guest information

2. CHECK-IN
   ├── Validate booking status
   ├── Validate room is vacant
   ├── Update booking → checked_in
   ├── Update room → occupied
   ├── Create bill with room charges
   ├── Apply advance payment (if exists)
   └── Transaction committed

3. DURING STAY
   ├── Add misc charges (laundry, spa, etc.)
   ├── Add restaurant orders
   └── Track in real-time

4. CHECK-OUT
   ├── Aggregate all charges
   ├── Calculate tax
   ├── Verify full payment
   ├── Finalize bill
   ├── Generate invoice (sequential number)
   ├── Update booking → checked_out
   ├── Update room → cleaning
   └── Transaction committed
```

### Financial Transaction Flow
```
                    ┌─────────────────┐
                    │   Booking       │
                    └────────┬────────┘
                             │
                ┌────────────▼──────────────┐
                │    Room Charges           │
                │    (nights × rate)        │
                └────────────┬──────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼──────┐    ┌───────▼────────┐   ┌──────▼────────┐
│ Misc Charges │    │ Restaurant POS │   │   Advance     │
│ (Spa, etc.)  │    │    Orders      │   │   Payment     │
└───────┬──────┘    └───────┬────────┘   └──────┬────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Bill (Folio)  │
                    │   • Subtotal    │
                    │   • Tax         │
                    │   • Total       │
                    │   • Paid        │
                    │   • Balance     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │     Invoice     │
                    │  INV-XXXX-0001  │
                    └─────────────────┘
```

## 🔄 API Request Flow

```
1. Client Request
   │
   ├──▶ Headers: Authorization Bearer Token
   ├──▶ Headers: X-Hotel-ID (optional for admin)
   └──▶ Body: Request data

2. Middleware Stack
   │
   ├──▶ authenticate: Verify JWT, extract user info
   │
   ├──▶ tenantIsolation: Set hotel context
   │    • Hotel users: Use JWT hotelId
   │    • Admin: Use X-Hotel-ID or query param
   │
   └──▶ authorize: Check role permissions

3. Controller
   │
   ├──▶ Validate request (Zod schema)
   │
   └──▶ Call service method

4. Service Layer
   │
   ├──▶ Business logic validation
   ├──▶ Database queries (tenant-filtered)
   ├──▶ Transaction management
   └──▶ Return data

5. Response
   │
   └──▶ JSend format: {status, data, message}
```

## 💾 Database Schema Design

### Core Principles
1. **UUID Primary Keys:** Prevents enumeration attacks
2. **Tenant Isolation:** hotel_id in every table
3. **Audit Trails:** created_at, updated_at, created_by, updated_by
4. **Soft Deletes:** is_deleted flag for financial records
5. **Referential Integrity:** Foreign keys with cascade
6. **Indexes:** Optimized for common queries

### Key Relationships
```
Hotel (1) ──┬──▶ (M) Users
            ├──▶ (M) Rooms
            ├──▶ (M) Bookings
            ├──▶ (M) Bills
            ├──▶ (M) Invoices
            ├──▶ (M) Expenses
            └──▶ (M) Restaurant Orders

Booking (1) ──┬──▶ (1) Bill
              ├──▶ (M) Advance Payments
              ├──▶ (M) Misc Charges
              └──▶ (M) Restaurant Orders

Bill (1) ────▶ (1) Invoice
```

## 🚀 Scalability Design

### Horizontal Scaling
- **Stateless API:** No session storage on server
- **JWT Tokens:** Client-side session management
- **Database Pooling:** Connection reuse
- **Load Balancer:** Distribute traffic
- **PM2 Cluster Mode:** Multi-process

### Vertical Scaling
- **Efficient Queries:** Indexed lookups
- **Transaction Optimization:** Minimal lock time
- **Pagination:** Large dataset handling
- **Lazy Loading:** Relations loaded as needed

## 🔒 Data Security

### Encryption
- **Passwords:** bcrypt hashing (10 rounds)
- **JWT:** HMAC-SHA256 signed tokens
- **HTTPS:** Transport encryption (production)

### Access Control
- **Row-Level:** Automatic hotel_id filtering
- **Role-Based:** Permission checks
- **API-Level:** JWT authentication required

### Audit Logging
Every record tracks:
- Who created it (created_by)
- When created (created_at)
- Who last updated (updated_by)
- When last updated (updated_at)

## 📈 Performance Optimizations

### Database
- **Connection Pooling:** Reuse connections
- **Prepared Statements:** Prisma compiled queries
- **Indexes:** All FK and frequently queried fields
- **Query Optimization:** Select only needed fields

### Application
- **Async/Await:** Non-blocking operations
- **Transaction Batching:** Multiple operations in one transaction
- **Error Handling:** express-async-errors for clean code

## 🛠️ Development Features

### Type Safety
- **TypeScript:** Compile-time type checking
- **Prisma:** Database type generation
- **Zod:** Runtime validation

### Code Quality
- **Modular Architecture:** Clear separation of concerns
- **Single Responsibility:** Each module has one job
- **DRY Principle:** Reusable utilities
- **Clean Code:** Readable and maintainable

## 🔄 Deployment Architecture

```
┌────────────────────────────────────────┐
│         Load Balancer / CDN            │
└────────────┬───────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼─────┐     ┌────▼────┐
│ Server 1│     │ Server 2│  (PM2 Cluster)
└───┬─────┘     └────┬────┘
    │                │
    └────────┬───────┘
             │
    ┌────────▼────────┐
    │   PostgreSQL    │
    │   Primary       │
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │   PostgreSQL    │
    │   Replica       │  (Read-only)
    └─────────────────┘
```

## 📊 Monitoring Points

### Health Checks
- `/health` endpoint
- Database connectivity
- Memory usage
- Response times

### Logging
- API requests (pino-http)
- Business events (check-in, check-out)
- Errors and exceptions
- Financial transactions (audit)

### Metrics
- Request rate
- Error rate
- Response time
- Database query performance

---

This architecture supports:
✅ Unlimited hotels  
✅ Horizontal scaling  
✅ High availability  
✅ Data isolation  
✅ Financial integrity  
✅ Audit compliance  
✅ Production-ready deployment  
