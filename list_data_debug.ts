
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const hotel = await prisma.hotel.findFirst();
    const room = await prisma.room.findFirst();
    const user = await prisma.user.findFirst();
    const menu = await prisma.restaurantMenu.findFirst();

    console.log("Data Summary:");
    console.log("Hotel:", hotel ? `${hotel.name} (${hotel.id})` : "NONE");
    console.log("Room:", room ? `${room.roomNumber} (Hotel: ${room.hotelId})` : "NONE");
    console.log("User:", user ? `${user.username} (Hotel: ${user.hotelId})` : "NONE");
    console.log("Menu Item:", menu ? `${menu.name} (Hotel: ${menu.hotelId})` : "NONE");

  } catch (err: any) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
