import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listTables() {
    try {
        const tables: any[] = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log('--- Tables in Public Schema ---');
        tables.forEach(t => console.log(t.table_name));

        const invoiceCount: any[] = await prisma.$queryRaw`SELECT count(*) FROM "invoices"`;
        console.log(`Raw Invoice Count: ${invoiceCount[0].count}`);

        const userCount: any[] = await prisma.$queryRaw`SELECT count(*) FROM "users"`;
        console.log(`Raw User Count: ${userCount[0].count}`);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

listTables();
