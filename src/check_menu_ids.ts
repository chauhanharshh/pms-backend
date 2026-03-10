import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const catCounts = await (prisma as any).restaurantCategory.groupBy({
            by: ['hotelId'],
            _count: { id: true }
        });
        console.log('Category Counts by Hotel ID:');
        catCounts.forEach((c: any) => console.log(`  Hotel ${c.hotelId}: ${c._count.id} categories`));

        const menuCounts = await (prisma as any).restaurantMenu.groupBy({
            by: ['hotelId'],
            _count: { id: true }
        });
        console.log('Menu Item Counts by Hotel ID:');
        menuCounts.forEach((m: any) => console.log(`  Hotel ${m.hotelId}: ${m._count.id} items`));

        const hotels = await (prisma as any).hotel.findMany({ select: { id: true, name: true } });
        console.log('Hotels in DB:');
        hotels.forEach((h: any) => console.log(`  ${h.id} (${h.name})`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
