import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const hotels = await (prisma as any).hotel.findMany();
        console.log('--- ALL HOTELS ---');
        hotels.forEach((h: any) => console.log(`${h.name}: ${h.id}`));

        const users = await (prisma as any).user.findMany({
            select: { id: true, username: true, hotelId: true }
        });
        console.log('\n--- USERS ---');
        users.forEach((u: any) => console.log(`${u.username}: ${u.hotelId}`));

        const menuStats = await (prisma as any).restaurantMenu.groupBy({
            by: ['hotelId'],
            _count: { id: true }
        });
        console.log('\n--- MENU ITEMS PER HOTEL ID ---');
        menuStats.forEach((ms: any) => console.log(`${ms.hotelId}: ${ms._count.id}`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
