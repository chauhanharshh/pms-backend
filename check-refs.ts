import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkReferences() {
    const orderItemsCount = await prisma.restaurantOrderItem.count();
    const kotCount = await prisma.restaurantKOT.count();

    console.log(`Order Items: ${orderItemsCount}`);
    console.log(`KOTs: ${kotCount}`);
}

checkReferences().catch(console.error).finally(() => prisma.$disconnect());
