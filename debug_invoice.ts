import { PrismaClient } from '@prisma/client';
import { InvoicesService } from './src/modules/invoices/invoices.service.ts';
import fs from 'fs';

const prisma = new PrismaClient();
const invoicesService = new InvoicesService();

async function run() {
    const bill = await prisma.bill.findFirst({
        where: { invoice: null, isDeleted: false },
        include: { booking: true }
    });

    if (!bill) {
        fs.writeFileSync('error_out.txt', "No bill found");
        return;
    }

    const user = await prisma.user.findFirst();

    try {
        const result = await invoicesService.generateInvoice({ billId: bill.id }, bill.hotelId, user!.id);
        fs.writeFileSync('error_out.txt', "Success!");
    } catch (err: any) {
        fs.writeFileSync('error_out.txt', err.stack);
    }

    await prisma.$disconnect();
}

run();
