import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        const hotels = await prisma.hotel.findMany();
        console.log('--- HOTELS ---');
        console.log(JSON.stringify(hotels.map(h => ({ id: h.id, name: h.name })), null, 2));

        const menuStats = await prisma.restaurantMenu.groupBy({
            by: ['hotelId'],
            _count: { id: true }
        });
        console.log('\n--- MENU STATS ---');
        console.log(JSON.stringify(menuStats, null, 2));

        const users = await prisma.user.findMany({
            select: { id: true, username: true, hotelId: true, role: true }
        });
        console.log('\n--- USERS ---');
        console.log(JSON.stringify(users, null, 2));

        const categories = await prisma.restaurantCategory.findMany({
            select: { id: true, name: true, hotelId: true }
        });
        console.log('\n--- CATEGORIES ---');
        console.log(JSON.stringify(categories, null, 2));

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

check();
