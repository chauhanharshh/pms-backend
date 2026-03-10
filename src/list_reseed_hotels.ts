import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const hotels = await prisma.hotel.findMany();
    console.log('--- WHAT RE-SEED SEES ---');
    hotels.forEach(h => console.log(`${h.name} (${h.id})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
