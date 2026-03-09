import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        const hotels = await prisma.hotel.findMany();
        console.log(JSON.stringify(hotels, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

check();
