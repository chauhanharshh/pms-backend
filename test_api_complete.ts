
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { JwtUtil } from './src/utils/jwt';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting API-based verification...");
    try {
        // 1. Get a user and token
        const user = await prisma.user.findFirst({ where: { role: 'admin' } });
        if (!user) {
            console.error("No admin user found.");
            return;
        }

        const token = JwtUtil.sign({
            userId: user.id,
            hotelId: user.hotelId || undefined,
            role: user.role
        });

        const api = axios.create({
            baseURL: 'http://localhost:5000/api/v1',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        // 2. Find a hotel and room for creating a test case
        const hotel = await prisma.hotel.findFirst({
            where: { rooms: { some: {} } },
            include: { rooms: true }
        });
        if (!hotel) {
            console.error("No hotel with rooms found.");
            return;
        }
        const room = hotel.rooms[0];
        console.log(`Using Hotel: ${hotel.name}, Room: ${room.roomNumber}`);

        // 3. Create a test booking and bill directly via Prisma for setup
        console.log("Setting up test data...");
        const booking = await prisma.booking.create({
            data: {
                hotelId: hotel.id,
                roomId: room.id,
                guestName: "API Test Guest",
                guestPhone: "8888888888",
                checkInDate: new Date(),
                checkOutDate: new Date(Date.now() + 86400000),
                status: 'checked_in',
                totalAmount: 1200,
                createdBy: user.id
            }
        });

        const bill = await prisma.bill.create({
            data: {
                hotelId: hotel.id,
                bookingId: booking.id,
                roomCharges: 1200,
                subtotal: 1200,
                totalAmount: 1200,
                balanceDue: 1200,
                status: 'pending',
                createdBy: user.id
            }
        });

        // 4. Test POST /api/v1/invoices
        console.log(`Calling POST /api/v1/invoices for billId: ${bill.id}`);
        const postResp = await api.post('/invoices', {
            billId: bill.id,
            guestAddress: "456 API Ave, Code City"
        }, {
            headers: { 'X-Hotel-ID': hotel.id }
        });

        if (postResp.status === 201 || postResp.status === 200) {
            console.log("SUCCESS: Invoice generated via API.");
            console.log("Invoice Number:", postResp.data.data?.invoiceNumber);
        } else {
            console.error("FAIL: API returned unexpected status:", postResp.status, postResp.data);
            return;
        }

        const invoiceId = postResp.data.data?.id;

        // 5. Test GET /api/v1/invoices
        console.log("Calling GET /api/v1/invoices...");
        const getResp = await api.get('/invoices', {
            params: { hotelId: hotel.id },
            headers: { 'X-Hotel-ID': hotel.id }
        });

        const found = getResp.data.data.some((inv: any) => inv.id === invoiceId);
        if (found) {
            console.log("SUCCESS: New invoice found in GET results.");
        } else {
            console.error("FAIL: New invoice NOT found in GET results.");
        }

        console.log("\nAPI VERIFICATION SUCCESSFUL.");

    } catch (err: any) {
        console.error("API VERIFICATION FAILED:");
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error(`Data:`, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
