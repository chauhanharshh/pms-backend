import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const hotelId = 'ae5392a9-9bd2-42f7-a1ea-38022d1f218c';

        const categories = await (prisma as any).restaurantCategory.findMany({
            where: { hotelId }
        });
        console.log(`Categories for ${hotelId}:`, categories.length);

        const items = await (prisma as any).restaurantMenu.findMany({
            where: { hotelId }
        });
        console.log(`Items for ${hotelId}:`, items.length);

        const orphans = items.filter((i: any) => !categories.find((c: any) => c.id === i.categoryId));
        console.log('Orphaned items (category ID not found):', orphans.length);

        if (orphans.length > 0) {
            console.log('Sample Orphan Category ID:', orphans[0].categoryId);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
