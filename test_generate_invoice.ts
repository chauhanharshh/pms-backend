import { PrismaClient } from '@prisma/client';
import { InvoicesService } from './src/modules/invoices/invoices.service';

const prisma = new PrismaClient();
const service = new InvoicesService();

async function main() {
  try {
    console.log("Fetching first bill without an invoice...");
    const bill = await prisma.bill.findFirst({
        where: { invoice: null },
        include: { booking: true }
    });

    if (!bill) {
      console.log("No bill without invoice found, let's create a test bill/booking.");
      return;
    }

    const hotelId = bill.hotelId;
    const userId = bill.createdBy || 'test-user-id';
    
    console.log(`Testing generateInvoice for billId: ${bill.id}, hotelId: ${hotelId}`);
    const invoice = await service.generateInvoice({ billId: bill.id }, hotelId, userId);
    console.log("Success! Generated Invoice number:", invoice.invoiceNumber);

  } catch (error: any) {
    console.error("Error in generateInvoice:");
    console.error(error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
