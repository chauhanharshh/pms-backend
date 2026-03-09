# Quick Start Guide - Multi-Hotel PMS Backend

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Git installed

### Step 1: Setup Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE pms_database;
CREATE USER pms_user WITH PASSWORD 'pms_password';
GRANT ALL PRIVILEGES ON DATABASE pms_database TO pms_user;
\q
```

### Step 2: Install and Configure

```bash
# Navigate to project directory
cd pms-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and update DATABASE_URL if needed
# DATABASE_URL="postgresql://pms_user:pms_password@localhost:5432/pms_database"
```

### Step 3: Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed demo data
npm run seed
```

Expected output:
```
✅ Admin user created: admin
✅ Demo hotel created: Grand Plaza Hotel
✅ Hotel manager created: manager
✅ Hotel user created: frontdesk
✅ Room types created
✅ Rooms created
✅ Restaurant menu created
🎉 Seeding completed successfully!
```

### Step 4: Start Server

```bash
# Development mode with hot reload
npm run dev
```

You should see:
```
🚀 Server running on http://0.0.0.0:5000
📝 Environment: development
🏨 Multi-Hotel PMS Backend ready
```

### Step 5: Test API

#### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

Expected: `{"status":"ok","timestamp":"..."}`

#### Test 2: Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Save the `token` from response!

#### Test 3: Get Hotels
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     http://localhost:5000/api/v1/auth/me
```

## 📚 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager | manager123 |
| Front Desk | frontdesk | user123 |

## 🏨 Demo Data Included

After seeding, you'll have:
- ✅ 1 Demo Hotel (Grand Plaza Hotel)
- ✅ 5 Rooms (3 Deluxe, 2 Suites)
- ✅ 2 Room Types
- ✅ 3 Users (Admin, Manager, Front Desk)
- ✅ Restaurant menu with sample items

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm start                # Start production build

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open database GUI
npm run seed             # Seed demo data

# Backup
npm run backup           # Create database backup
```

## 📡 API Base URL

Development: `http://localhost:5000/api/v1`

All endpoints require Bearer token except `/auth/login`

## 🔍 Browse Database

```bash
# Open Prisma Studio (database GUI)
npm run prisma:studio
```

Visit: http://localhost:5555

## 🐛 Troubleshooting

### Port 5000 already in use?
Change PORT in `.env` file:
```env
PORT=5001
```

### Database connection error?
Verify PostgreSQL is running:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql
```

### Migration failed?
Reset and try again:
```bash
npx prisma migrate reset
npm run seed
```

## 📖 Next Steps

1. **Read Full Documentation:** See `README.md`
2. **API Reference:** See `API_DOCUMENTATION.md`
3. **Deployment Guide:** See `DEPLOYMENT.md`
4. **Test Endpoints:** Use Postman or curl

## 🎯 Test Complete Workflow

### 1. Create Reservation
```bash
# Get room ID first from /rooms endpoint
# Then create reservation
curl -X POST http://localhost:5000/api/v1/bookings/reservation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "ROOM_UUID_HERE",
    "guestName": "John Doe",
    "guestPhone": "+1234567890",
    "checkInDate": "2025-03-15",
    "checkOutDate": "2025-03-17",
    "adults": 2,
    "totalAmount": 10000,
    "advanceAmount": 5000
  }'
```

### 2. Check-In
```bash
curl -X PUT http://localhost:5000/api/v1/bookings/BOOKING_ID/check-in \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Check-Out
```bash
curl -X PUT http://localhost:5000/api/v1/bookings/BOOKING_ID/check-out \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"finalPayment": 5000}'
```

## 💡 Pro Tips

1. **Use Prisma Studio** for visual database management
2. **Check logs** in console for debugging
3. **Read error messages** - they're descriptive
4. **Use the seed data** to understand the data structure
5. **Test with different roles** to see permission differences

## 🆘 Need Help?

1. Check console logs for errors
2. Verify `.env` configuration
3. Ensure PostgreSQL is running
4. Review `README.md` for detailed info
5. Check `API_DOCUMENTATION.md` for endpoint details

## ✅ You're Ready!

Your Multi-Hotel PMS backend is now running. Start building your frontend or test with API clients!

**Happy Coding! 🚀**
