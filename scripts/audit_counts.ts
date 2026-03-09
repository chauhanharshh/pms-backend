import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    try {
        const totalInvoices = await prisma.invoice.count();
        const restaurantInvoices = await prisma.invoice.count({ where: { type: 'RESTAURANT' } });
        const roomInvoices = await prisma.invoice.count({ where: { type: 'ROOM' } });
        const linkedInvoices = await prisma.invoice.count({ where: { restaurantOrderId: { not: null } } });
        const orders = await prisma.restaurantOrder.count();
        const users = await prisma.user.count();
        const hotels = await prisma.hotel.count();

        console.log('--- DB Audit ---');
        console.log(`Total Invoices: ${totalInvoices}`);
        console.log(`Restaurant Invoices: ${restaurantInvoices}`);
        console.log(`Room Invoices: ${roomInvoices}`);
        console.log(`Linked to RestaurantOrder: ${linkedInvoices}`);
        console.log(`Total Restaurant Orders: ${orders}`);
        console.log(`Total Users: ${users}`);
        console.log(`Total Hotels: ${hotels}`);
        console.log('--- End Audit ---');
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

check();
