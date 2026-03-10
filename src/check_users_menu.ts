import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await (prisma as any).user.findMany({
            select: { id: true, username: true, role: true, hotelId: true }
        });
        console.log('Users and their Hotel IDs:');
        users.forEach((u: any) => console.log(`  ${u.username} (${u.role}): ${u.hotelId}`));

        const hotels = await (prisma as any).hotel.findMany({
            select: { id: true, name: true }
        });
        console.log('Hotels in DB:');
        hotels.forEach((h: any) => console.log(`  ${h.id} (${h.name})`));

        const menuStats = await (prisma as any).restaurantMenu.groupBy({
            by: ['hotelId'],
            _count: { id: true }
        });
        console.log('Menu Items per Hotel ID:');
        menuStats.forEach((ms: any) => console.log(`  Hotel ${ms.hotelId}: ${ms._count.id} items`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
