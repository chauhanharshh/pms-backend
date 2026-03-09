import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recover() {
    console.log('--- Starting Data Recovery ---');

    try {
        // 1. Tag legacy restaurant invoices correctly
        console.log('Updating legacy restaurant invoices...');
        const updatedInvoices = await prisma.invoice.updateMany({
            where: {
                restaurantOrderId: { not: null },
                type: 'ROOM' // All legacy records defaulted to ROOM during migration
            },
            data: {
                type: 'RESTAURANT',
                source: 'POS' // Tag legacy as POS source
            }
        });
        console.log(`Updated ${updatedInvoices.count} restaurant invoices.`);

        // 2. Ensure all records have isDeleted = false (if any default issues occurred)
        console.log('Ensuring records are not hidden by isDeleted...');
        const kotReset = await prisma.restaurantKOT.updateMany({
            where: { isDeleted: undefined as any },
            data: { isDeleted: false }
        });
        console.log(`Reset isDeleted for ${kotReset.count} KOTs.`);

        // 3. Optional: Verify other modules if they have new filters
        // No other modules had restrictive type filters added in the last migration.

        console.log('--- Data Recovery Completed Successfully ---');
    } catch (error) {
        console.error('Error during data recovery:', error);
    } finally {
        await prisma.$disconnect();
    }
}

recover();
