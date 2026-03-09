import { PrismaClient } from '@prisma/client';

async function check() {
    const prisma = new PrismaClient();
    try {
        const hotels = await prisma.hotel.findMany({
            include: {
                _count: {
                    select: {
                        restaurantCategories: true,
                        restaurantMenu: true,
                        users: true
                    }
                }
            }
        });

        console.log('--- CLOUD HOTELS REPORT ---');
        hotels.forEach(h => {
            console.log(`Hotel: ${h.name} (${h.id})`);
            console.log(`  Categories: ${h._count.restaurantCategories}`);
            console.log(`  Menu Items: ${h._count.restaurantMenu}`);
            console.log(`  Users: ${h._count.users}`);
            console.log('---------------------------');
        });

        const users = await prisma.user.findMany({
            select: { username: true, role: true, hotel: { select: { name: true } } }
        });
        console.log('\n--- CLOUD USERS ---');
        console.log(JSON.stringify(users, null, 2));

    } catch (error) {
        console.error('Error during cloud check:', error);
    } finally {
        await prisma.$disconnect();
    }
}

check();
