
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const hotels = await prisma.hotel.findMany({
      include: {
        _count: {
          select: { rooms: true }
        },
        rooms: {
           take: 1
        },
        users: {
            where: { role: 'admin' },
            take: 1
        }
      }
    });

    console.log("Hotels found:", hotels.length);
    for (const h of hotels) {
      console.log(`- Hotel: ${h.name} (${h.id})`);
      console.log(`  Rooms count: ${h._count.rooms}`);
      if (h.rooms.length > 0) {
          console.log(`  First Room ID: ${h.rooms[0].id}`);
      }
      if (h.users.length > 0) {
          console.log(`  Admin User ID: ${h.users[0].id}`);
      }
    }
  } catch (err: any) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
