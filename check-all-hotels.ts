import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Cloud Database Menu Check ---');
    const hotels = await prisma.hotel.findMany({
        include: {
            _count: {
                select: {
                    restaurantCategories: true,
                    restaurantMenu: true
                }
            }
        }
    });

    console.log(`Total Hotels found: ${hotels.length}`);
    hotels.forEach(h => {
        console.log(`Hotel: ${h.name} (${h.id})`);
        console.log(`  Categories: ${h._count.restaurantCategories}`);
        console.log(`  Menu Items: ${h._count.restaurantMenu}`);
    });

    const categories = await prisma.restaurantCategory.findMany({
        take: 5,
        include: {
            _count: {
                select: { menuItems: true }
            }
        }
    });
    console.log('\n--- Sample Categories ---');
    categories.forEach(c => {
        console.log(`Category: ${c.name} (Hotel: ${c.hotelId}) Items: ${c._count.menuItems} Active: ${c.isActive}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
