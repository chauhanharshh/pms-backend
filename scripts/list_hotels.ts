import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const hotels = await prisma.hotel.findMany();
    console.log(JSON.stringify(hotels, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
