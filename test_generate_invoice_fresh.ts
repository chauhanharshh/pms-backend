
import { PrismaClient } from '@prisma/client';
import { InvoicesService } from './src/modules/invoices/invoices.service';

const prisma = new PrismaClient();
const service = new InvoicesService();

async function main() {
  try {
    // 1. Get a hotel and a user
    const hotel = await prisma.hotel.findFirst();
    const user = await prisma.user.findFirst({ where: { role: 'admin' } });

    if (!hotel || !user) {
      console.log("Hotel or Admin user not found.");
      return;
    }

    // 2. Get a room
    const room = await prisma.room.findFirst({ where: { hotelId: hotel.id } });
    if (!room) {
      console.log("No room found for hotel.");
      return;
    }

    console.log("Creating test booking and bill...");
    const booking = await prisma.booking.create({
      data: {
        hotelId: hotel.id,
        roomId: room.id,
        guestName: 'Test Guest',
        guestPhone: '1234567890',
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 86400000), // tomorrow
        totalAmount: 1000,
        status: 'checked_in',
        createdBy: user.id
      }
    });

    const bill = await prisma.bill.create({
      data: {
        hotelId: hotel.id,
        bookingId: booking.id,
        roomCharges: 1000,
        subtotal: 1000,
        totalAmount: 1000,
        balanceDue: 1000,
        createdBy: user.id
      }
    });

    console.log(`Created Bill ID: ${bill.id}. Now generating invoice...`);

    const invoice = await service.generateInvoice({ billId: bill.id }, hotel.id, user.id);
    console.log("SUCCESS! Invoice generated:", invoice.invoiceNumber);

  } catch (error: any) {
    console.error("ERROR generating invoice:");
    console.error(error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
