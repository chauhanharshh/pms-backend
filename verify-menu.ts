import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
    const categoriesCount = await prisma.restaurantCategory.count();
    const itemsCount = await prisma.restaurantMenu.count();

    const categories = await prisma.restaurantCategory.findMany({
        select: { name: true, _count: { select: { menuItems: true } } }
    });

    console.log(`Summary:`);
    console.log(`Total Categories: ${categoriesCount}`);
    console.log(`Total Menu Items: ${itemsCount}`);
    console.log(`\nDetailed Breakdown:`);
    categories.forEach(c => {
        console.log(`- ${c.name}: ${c._count.menuItems} items`);
    });
}

verify().catch(console.error).finally(() => prisma.$disconnect());
