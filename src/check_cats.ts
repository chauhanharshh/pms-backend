import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const categories = await (prisma as any).restaurantCategory.findMany({
            select: { id: true, name: true, hotelId: true }
        });
        console.log('Categories in DB:');
        categories.forEach((c: any) => console.log(`  ${c.name}: ${c.hotelId}`));

        const menuItems = await (prisma as any).restaurantMenu.findMany({
            select: { itemName: true, hotelId: true, categoryId: true },
            take: 5
        });
        console.log('\nSample Menu Items:');
        menuItems.forEach((m: any) => console.log(`  ${m.itemName}: hotelId=${m.hotelId}, categoryId=${m.categoryId}`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
