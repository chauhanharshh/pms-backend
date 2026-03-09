import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyDetailed() {
    const hotel = await prisma.hotel.findFirst();
    if (!hotel) return console.log("No hotel found");

    const categories = await prisma.restaurantCategory.findMany({
        where: { hotelId: hotel.id },
        include: { _count: { select: { menuItems: true } } },
        orderBy: { sortOrder: 'asc' }
    });

    const totalItems = await prisma.restaurantMenu.count({ where: { hotelId: hotel.id } });

    console.log(`\n--- Verification Report for ${hotel.name} ---`);
    console.log(`Total Categories: ${categories.length}`);
    console.log(`Total Menu Items: ${totalItems}`);
    console.log(`\nCategory Breakdown:`);
    categories.forEach((c, i) => {
        console.log(`${i + 1}. ${c.name}: ${c._count.menuItems} items`);
    });
}

verifyDetailed().catch(console.error).finally(() => prisma.$disconnect());
