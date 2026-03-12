const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const userCount = await prisma.user.count();
    const hotelCount = await prisma.hotel.count();
    const bookingCount = await prisma.booking.count();
    console.log(`Users: ${userCount}, Hotels: ${hotelCount}, Bookings: ${bookingCount}`);

    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if(admin) console.log(`Found Admin: ${admin.username} / ${admin.email}`);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
