# API Documentation - Multi-Hotel PMS

Base URL: `http://localhost:5000/api/v1`

## Response Format

All API responses follow JSend format:

### Success Response
```json
{
  "status": "success",
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description"
}
```

### Validation Error
```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [...]
}
```

## Authentication

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "admin",
      "fullName": "System Administrator",
      "role": "admin",
      "hotelId": null,
      "hotel": null
    }
  },
  "message": "Login successful"
}
```

### Get Profile
```http
GET /auth/me
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "username": "admin",
    "fullName": "System Administrator",
    "email": "admin@pms.com",
    "role": "admin",
    "hotelId": null
  }
}
```

## Hotels

### List Hotels
```http
GET /hotels
Authorization: Bearer YOUR_TOKEN
X-Hotel-ID: hotel-uuid (optional for admin)
```

**Query Parameters:**
- None (tenant isolation handles filtering)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "hotel-uuid",
      "name": "Grand Plaza Hotel",
      "city": "Mumbai",
      "state": "Maharashtra",
      "phone": "+91-22-12345678",
      "email": "info@grandplaza.com",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Hotel Details
```http
GET /hotels/:id
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "hotel-uuid",
    "name": "Grand Plaza Hotel",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "phone": "+91-22-12345678",
    "email": "info@grandplaza.com",
    "gstNumber": "27AABCU9603R1ZX",
    "checkInTime": "14:00",
    "checkOutTime": "12:00",
    "taxRate": "12.00",
    "currency": "INR",
    "isActive": true
  }
}
```

### Create Hotel (Admin Only)
```http
POST /hotels
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name": "New Hotel",
  "address": "456 Beach Road",
  "city": "Goa",
  "state": "Goa",
  "phone": "+91-832-1234567",
  "email": "info@newhotel.com",
  "gstNumber": "30AABCU9603R1ZX",
  "checkInTime": "14:00",
  "checkOutTime": "12:00",
  "taxRate": 12,
  "currency": "INR"
}
```

### Update Hotel
```http
PUT /hotels/:id
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Updated Hotel Name",
  "phone": "+91-832-9999999"
}
```

### Clone Hotel (Admin Only)
```http
POST /hotels/:id/clone
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name": "Cloned Hotel Name"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "new-hotel-uuid",
    "name": "Cloned Hotel Name",
    ...
  },
  "message": "Hotel cloned successfully"
}
```

## Bookings

### List Bookings
```http
GET /bookings
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `status` - Filter by status (confirmed, checked_in, checked_out, cancelled)
- `startDate` - Filter by check-in date (YYYY-MM-DD)
- `endDate` - Filter by check-out date (YYYY-MM-DD)

**Example:**
```http
GET /bookings?status=checked_in&startDate=2025-03-01
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "booking-uuid",
      "hotelId": "hotel-uuid",
      "roomId": "room-uuid",
      "guestName": "John Doe",
      "guestPhone": "+1234567890",
      "checkInDate": "2025-03-15",
      "checkOutDate": "2025-03-17",
      "adults": 2,
      "children": 0,
      "totalAmount": "10000.00",
      "advanceAmount": "5000.00",
      "status": "checked_in",
      "room": {
        "roomNumber": "101",
        "roomType": {
          "name": "Deluxe Room"
        }
      },
      "bill": {
        "id": "bill-uuid",
        "totalAmount": "10000.00",
        "balanceDue": "5000.00"
      }
    }
  ]
}
```

### Get Booking Details
```http
GET /bookings/:id
Authorization: Bearer YOUR_TOKEN
```

**Response:** Full booking with room, bill, charges, orders

### Create Reservation
```http
POST /bookings/reservation
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "roomId": "room-uuid",
  "guestName": "John Doe",
  "guestPhone": "+1234567890",
  "guestEmail": "john@example.com",
  "idProof": "DL123456",
  "addressLine": "123 Street, City",
  "checkInDate": "2025-03-15",
  "checkOutDate": "2025-03-17",
  "adults": 2,
  "children": 1,
  "totalAmount": 10000,
  "advanceAmount": 5000,
  "source": "walk_in",
  "specialRequests": "Late check-in"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "booking-uuid",
    "status": "confirmed",
    ...
  },
  "message": "Reservation created successfully"
}
```

### Check-In
```http
PUT /bookings/:id/check-in
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "booking-uuid",
    "status": "checked_in",
    "room": {
      "status": "occupied"
    }
  },
  "message": "Check-in completed successfully"
}
```

**Process:**
1. Validates booking is `confirmed`
2. Validates room is `vacant`
3. Updates booking → `checked_in`
4. Updates room → `occupied`
5. Creates bill with room charges
6. Applies advance payment

### Check-Out
```http
PUT /bookings/:id/check-out
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "finalPayment": 5000
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "booking": { ... },
    "bill": {
      "id": "bill-uuid",
      "status": "finalized",
      "totalAmount": "10500.00",
      "paidAmount": "10500.00"
    },
    "invoice": {
      "id": "invoice-uuid",
      "invoiceNumber": "INV-12345678-0001",
      "totalAmount": "10500.00"
    }
  },
  "message": "Check-out completed successfully"
}
```

**Process:**
1. Adds pending misc charges
2. Adds pending restaurant charges
3. Calculates tax
4. Verifies full payment
5. Finalizes bill
6. Generates invoice
7. Updates booking → `checked_out`
8. Updates room → `cleaning`

## Rooms

### List Rooms
```http
GET /rooms
Authorization: Bearer YOUR_TOKEN
```

### Check Room Availability
```http
GET /rooms/available
Authorization: Bearer YOUR_TOKEN

Query Parameters:
- checkInDate: YYYY-MM-DD
- checkOutDate: YYYY-MM-DD
```

### Update Room Status
```http
PUT /rooms/:id/status
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "status": "maintenance",
  "maintenanceNote": "AC repair needed"
}
```

**Valid Statuses:**
- `vacant` - Available for booking
- `occupied` - Guest checked in
- `cleaning` - Being cleaned
- `maintenance` - Under maintenance

## Bills & Invoices

### Get Bill for Booking
```http
GET /bills/:bookingId
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "bill-uuid",
    "bookingId": "booking-uuid",
    "roomCharges": "10000.00",
    "restaurantCharges": "350.00",
    "miscCharges": "150.00",
    "subtotal": "10500.00",
    "taxAmount": "1260.00",
    "totalAmount": "11760.00",
    "paidAmount": "5000.00",
    "balanceDue": "6760.00",
    "status": "pending"
  }
}
```

### Get Invoice
```http
GET /invoices/:id
Authorization: Bearer YOUR_TOKEN
```

## Expenses

### List Expenses
```http
GET /expenses
Authorization: Bearer YOUR_TOKEN

Query Parameters:
- startDate: YYYY-MM-DD
- endDate: YYYY-MM-DD
- category: string
```

### Create Expense
```http
POST /expenses
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "category": "Utilities",
  "description": "Electricity bill",
  "amount": 15000,
  "payee": "Power Company",
  "paymentMethod": "bank",
  "expenseDate": "2025-03-01",
  "receiptNumber": "REC-12345"
}
```

## Restaurant POS

### Get Menu
```http
GET /restaurant/menu
Authorization: Bearer YOUR_TOKEN
```

### Create Order
```http
POST /restaurant/orders
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "bookingId": "booking-uuid",
  "tableNumber": "T5",
  "items": [
    {
      "menuItemId": "item-uuid",
      "quantity": 2,
      "specialNote": "Less spicy"
    }
  ]
}
```

### Update Order Status
```http
PUT /restaurant/orders/:id/status
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "status": "kot_printed"
}
```

**Valid Statuses:**
- `pending` - Order placed
- `kot_printed` - Kitchen order printed
- `served` - Food served
- `billed` - Added to bill
- `cancelled` - Order cancelled

## Reports

### Occupancy Report
```http
GET /reports/occupancy
Authorization: Bearer YOUR_TOKEN

Query Parameters:
- startDate: YYYY-MM-DD
- endDate: YYYY-MM-DD
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalRooms": 50,
    "totalRoomNights": 1500,
    "occupiedRoomNights": 1200,
    "occupancyRate": "80.00",
    "period": {
      "startDate": "2025-03-01",
      "endDate": "2025-03-31"
    }
  }
}
```

### Revenue Report
```http
GET /reports/revenue
Authorization: Bearer YOUR_TOKEN

Query Parameters:
- startDate: YYYY-MM-DD
- endDate: YYYY-MM-DD
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalRevenue": "500000.00",
    "roomRevenue": "400000.00",
    "restaurantRevenue": "80000.00",
    "miscRevenue": "20000.00",
    "totalTax": "60000.00",
    "numberOfBills": 125
  }
}
```

### Consolidated Report (Admin Only)
```http
GET /reports/consolidated
Authorization: Bearer ADMIN_TOKEN

Query Parameters:
- startDate: YYYY-MM-DD (optional)
- endDate: YYYY-MM-DD (optional)
```

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request (business logic error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate entry) |
| 422 | Validation Error |
| 500 | Internal Server Error |

## Rate Limiting

Currently no rate limiting implemented. Recommended for production:
- 100 requests per minute per IP
- 1000 requests per hour per user

## Pagination

For list endpoints that support pagination:

```http
GET /endpoint?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Webhooks

Not currently implemented. Future consideration for:
- Booking confirmations
- Check-in/out notifications
- Payment confirmations

---

For additional examples and testing, see Postman collection (coming soon).
