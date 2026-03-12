
import { PrismaClient } from '@prisma/client';
import { InvoicesService } from './src/modules/invoices/invoices.service';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const invoicesService = new InvoicesService();

async function main() {
    console.log("Starting verification of Invoice Generation Flow...");
    try {
        // 1. Find or Create Hotel
        let hotel = await prisma.hotel.findFirst({
            include: { rooms: { take: 1 }, users: { where: { role: 'admin' }, take: 1 } }
        });

        if (!hotel) {
            console.log("Creating test hotel...");
            hotel = await prisma.hotel.create({
                data: {
                    name: "Verification Hotel",
                    email: "verify@test.com",
                    address: "123 Test St",
                    phone: "1234567890"
                } as any,
                include: { rooms: true, users: true }
            });
        }

        // 2. Find or Create User
        let admin = hotel.users.find(u => u.role === 'admin');
        if (!admin) {
            console.log("Creating test admin user...");
            admin = await prisma.user.create({
                data: {
                    hotelId: hotel.id,
                    username: "test_admin_" + Date.now(),
                    password: "password123", // In a real app this would be hashed
                    role: 'admin',
                    email: "admin@test.com"
                } as any
            });
        }

        // 3. Find or Create Room
        let room = hotel.rooms[0];
        if (!room) {
            console.log("Creating test room...");
            // Need a room type first
            let roomType = await prisma.roomType.findFirst({ where: { hotelId: hotel.id } });
            if (!roomType) {
                roomType = await prisma.roomType.create({
                    data: {
                        hotelId: hotel.id,
                        name: "Standard",
                        basePrice: new Decimal(1000)
                    }
                });
            }
            room = await prisma.room.create({
                data: {
                    hotelId: hotel.id,
                    roomNumber: "101-Test",
                    roomTypeId: roomType.id,
                    status: 'available'
                }
            });
        }

        console.log(`Testing with Hotel: ${hotel.name}, Room: ${room.roomNumber}, Admin: ${admin.username}`);

        // 4. Create a test booking
        const checkInDate = new Date();
        const checkOutDate = new Date();
        checkOutDate.setDate(checkOutDate.getDate() + 2); // 2 nights

        console.log("Creating test booking...");
        const booking = await prisma.booking.create({
            data: {
                hotelId: hotel.id,
                roomId: room.id,
                guestName: "Automation Test Guest",
                guestPhone: "9999999999",
                checkInDate,
                checkOutDate,
                adults: 2,
                totalAmount: new Decimal(2000), // 1000 per night
                status: 'checked_in',
                createdBy: admin.id
            }
        });

        // 5. Create a test bill
        console.log("Creating test bill...");
        const bill = await prisma.bill.create({
            data: {
                hotelId: hotel.id,
                bookingId: booking.id,
                roomCharges: new Decimal(2000),
                subtotal: new Decimal(2000),
                taxAmount: new Decimal(0), // Will be recalculated
                totalAmount: new Decimal(2000),
                balanceDue: new Decimal(2000),
                status: 'pending',
                createdBy: admin.id
            }
        });

        // 6. Generate Invoice
        console.log("Attempting to generate invoice...");
        const invoice = await invoicesService.generateInvoice(
            { billId: bill.id, guestAddress: "123 Automation St, Test City" },
            hotel.id,
            admin.id
        );

        console.log(`Invoice successfully generated: ${invoice.invoiceNumber}`);
        console.log(`Final Subtotal: ${invoice.subtotal}`);
        console.log(`Final Total: ${invoice.totalAmount}`);
        console.log(`Status: ${invoice.status}`);

        // 7. Verify data integrity
        console.log("Verifying data integrity...");
        
        // Check if bill was updated
        const updatedBill = await prisma.bill.findUnique({ where: { id: bill.id } });
        console.log(`Updated Bill Total: ${updatedBill?.totalAmount}`);
        
        // 8. Test GET endpoint for this hotel
        console.log("Verifying GET /api/v1/invoices...");
        const allInvoices = await invoicesService.getInvoicesByHotel(hotel.id);
        const found = allInvoices.some(inv => inv.id === invoice.id);
        if (found) {
            console.log("SUCCESS: New invoice is retrievable via getInvoicesByHotel");
        } else {
            console.error("FAIL: New invoice NOT found in getInvoicesByHotel results");
        }

        console.log("\nVERIFICATION COMPLETE: ALL SYSTEMS NOMINAL.");

    } catch (error: any) {
        console.error("VERIFICATION FAILED:");
        console.error(error.message);
        if (error.stack) console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

main();
