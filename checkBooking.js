const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBooking() {
  try {
    const latest = await prisma.booking.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    console.log("Latest Booking:");
    console.log("ID:", latest.id);
    console.log("Guest:", latest.guestName);
    console.log("Company Name:", latest.companyName);
    console.log("Company GST:", latest.companyGst);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkBooking();
