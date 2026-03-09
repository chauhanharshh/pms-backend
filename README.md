# Multi-Hotel Property Management System (PMS) - Backend

Enterprise-grade backend for managing multiple hotels with strict tenant isolation, complete financial tracking, and comprehensive business logic.

## 🏗️ Architecture

- **Framework:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** JWT
- **Validation:** Zod
- **Logging:** Pino
- **Architecture:** Clean Modular Architecture with Multi-Tenant Isolation

## ✨ Features

### Core Capabilities
✅ Multi-hotel support with strict tenant isolation  
✅ Role-based access control (Admin, Manager, Hotel User)  
✅ Complete booking lifecycle (Reservation → Check-in → Check-out)  
✅ Financial management (Bills, Invoices, Expenses)  
✅ Restaurant POS integration  
✅ Room management and availability checking  
✅ Advance payments and adjustment  
✅ Miscellaneous charges  
✅ Hotel cloning (configuration without financial data)  
✅ Comprehensive reporting (Occupancy, Revenue, Expenses)  

### Security Features
✅ JWT authentication  
✅ Tenant isolation middleware  
✅ Role-based authorization guards  
✅ Transaction-safe financial operations  
✅ Audit trail (created_by, updated_by timestamps)  

## 📦 Installation

### Prerequisites
- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm or yarn

### Step 1: Clone and Install

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Step 2: Configure Environment

Edit `.env` file:

```env
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# PostgreSQL connection
DATABASE_URL="postgresql://username:password@localhost:5432/pms_database?schema=public"

# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

### Step 3: Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with demo data
npm run seed
```

### Step 4: Start Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

Server will start at: `http://localhost:5000`

## 🔑 Default Login Credentials

After seeding, you can login with:

### Admin Account
- **Username:** admin
- **Password:** admin123
- **Capabilities:** Full system access, can manage all hotels

### Hotel Manager
- **Username:** manager
- **Password:** manager123
- **Capabilities:** Manage assigned hotel, cannot create hotels

### Front Desk User
- **Username:** frontdesk
- **Password:** user123
- **Capabilities:** Check-in/out, bookings, POS operations

## 📡 API Endpoints

### Authentication
```
POST   /api/v1/auth/login          # Login
GET    /api/v1/auth/me             # Get profile
POST   /api/v1/auth/logout         # Logout
```

### Hotels
```
GET    /api/v1/hotels              # List hotels (tenant-aware)
GET    /api/v1/hotels/:id          # Get hotel details
POST   /api/v1/hotels              # Create hotel (admin only)
PUT    /api/v1/hotels/:id          # Update hotel
POST   /api/v1/hotels/:id/clone    # Clone hotel (admin only)
```

### Bookings
```
GET    /api/v1/bookings                    # List bookings
GET    /api/v1/bookings/:id                # Get booking details
POST   /api/v1/bookings/reservation        # Create reservation
PUT    /api/v1/bookings/:id/check-in       # Check-in
PUT    /api/v1/bookings/:id/check-out      # Check-out
```

### Additional Modules
- `/api/v1/rooms` - Room management
- `/api/v1/bills` - Billing
- `/api/v1/invoices` - Invoices
- `/api/v1/expenses` - Expense tracking
- `/api/v1/advances` - Advance payments
- `/api/v1/misc-charges` - Miscellaneous charges
- `/api/v1/restaurant` - POS operations
- `/api/v1/reports` - Analytics and reports

## 🔐 Authentication

All API requests (except login) require a Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/v1/hotels
```

### Admin Hotel Switching

Admin users can access specific hotel data by adding header:

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     -H "X-Hotel-ID: hotel-uuid-here" \
     http://localhost:5000/api/v1/bookings
```

## 🏢 Multi-Tenant Architecture

### Tenant Isolation Rules

1. **Automatic Filtering:** All queries automatically filter by `hotel_id`
2. **Hotel Users:** Can only access their assigned hotel
3. **Admin Override:** Admins can view all hotels or switch context
4. **Cross-Tenant Prevention:** Strict validation prevents data leaks

### Example Query Flow

```typescript
// Hotel user request (automatic filtering)
GET /api/v1/bookings
→ WHERE hotel_id = user.hotel_id

// Admin request (all hotels)
GET /api/v1/bookings
→ No hotel_id filter

// Admin with hotel context
GET /api/v1/bookings
Header: X-Hotel-ID: abc-123
→ WHERE hotel_id = 'abc-123'
```

## 📊 Database Schema

### Core Tables
- `hotels` - Hotel master data
- `users` - System users
- `rooms` - Room inventory
- `room_types` - Room categories
- `bookings` - Reservations and stays
- `bills` - Folio/billing
- `invoices` - Tax invoices
- `expenses` - Operational expenses
- `advance_payments` - Deposits
- `misc_charges` - Additional charges
- `restaurant_orders` - POS orders
- `restaurant_menu` - Menu items

All tables include:
- `hotel_id` (except global tables)
- `created_at`, `updated_at`
- `created_by`, `updated_by`
- Soft delete support where needed

## 🔄 Business Logic

### Check-In Process
1. Validate booking exists and is `confirmed`
2. Validate room is `vacant`
3. Update booking status → `checked_in`
4. Update room status → `occupied`
5. Create bill with room charges
6. Apply advance payment if exists
7. **All in single transaction**

### Check-Out Process
1. Validate booking is `checked_in`
2. Add pending misc charges to bill
3. Add pending restaurant charges
4. Calculate tax
5. Verify payment (balance must be zero)
6. Finalize bill
7. Generate invoice with sequential number
8. Update booking → `checked_out`
9. Update room → `cleaning`
10. **All in single transaction**

### Hotel Cloning
Copies ONLY:
- Hotel configuration
- Room types
- Rooms (reset to vacant)
- Restaurant categories & menu

Does NOT copy:
- Bookings
- Bills/Invoices
- Expenses
- Orders

## 🧪 Testing APIs

### 1. Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### 2. List Hotels
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/v1/hotels
```

### 3. Create Reservation
```bash
curl -X POST http://localhost:5000/api/v1/bookings/reservation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-uuid",
    "guestName": "John Doe",
    "guestPhone": "+1234567890",
    "checkInDate": "2025-03-15",
    "checkOutDate": "2025-03-17",
    "adults": 2,
    "totalAmount": 10000,
    "advanceAmount": 5000
  }'
```

## 🗄️ Backup & Restore

### Automated Backup

The system includes automated backup script:

```bash
# Run manual backup
npm run backup

# Setup cron for nightly backups (Linux/Mac)
crontab -e
# Add: 0 2 * * * cd /path/to/pms-backend && npm run backup
```

### Manual Backup
```bash
pg_dump -h localhost -U pms_user -d pms_database > backup.sql
```

### Restore
```bash
psql -h localhost -U pms_user -d pms_database < backup.sql
```

## 🚀 Deployment

### Production Checklist

- [ ] Change `JWT_SECRET` to strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Configure production DATABASE_URL
- [ ] Setup automated backups
- [ ] Configure reverse proxy (nginx/apache)
- [ ] Enable HTTPS
- [ ] Setup monitoring/logging
- [ ] Configure firewall rules

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 📝 Development

### Adding New Module

1. Create module folder: `src/modules/your-module/`
2. Add files:
   - `your-module.service.ts` - Business logic
   - `your-module.controller.ts` - Request handlers
   - `your-module.routes.ts` - Route definitions
   - `your-module.validation.ts` - Zod schemas
3. Register routes in `server.ts`

### Database Changes

```bash
# Create migration
npx prisma migrate dev --name your_migration_name

# Apply migration
npm run prisma:migrate

# Reset database
npx prisma migrate reset
```

## 🛡️ Security Best Practices

1. **Always use transactions** for financial operations
2. **Never skip tenant isolation** middleware
3. **Validate all inputs** with Zod schemas
4. **Log financial overrides** for audit trails
5. **Use prepared statements** (Prisma does this)
6. **Rotate JWT secrets** periodically
7. **Keep dependencies updated**

## 🐛 Troubleshooting

### Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U pms_user -d pms_database

# Check Prisma connection
npx prisma db pull
```

### Migration Errors
```bash
# Reset and reseed
npx prisma migrate reset
npm run seed
```

### Port Already in Use
```bash
# Change PORT in .env file
PORT=5001
```

## 📞 Support

For issues or questions:
1. Check logs: Review console output
2. Database status: `npx prisma studio`
3. API testing: Use Postman/curl
4. Environment: Verify `.env` configuration

## 📄 License

Proprietary - All Rights Reserved

---

**Built with ❤️ for enterprise hotel management**
