import { PrismaClient } from '@prisma/client';
import { InvoicesService } from './src/modules/invoices/invoices.service';

const prisma = new PrismaClient();
const service = new InvoicesService();

async function main() {
  try {
    console.log("Fetching first hotel...");
    const hotel = await prisma.hotel.findFirst();
    if (!hotel) {
      console.log("No hotel found, cannot proceed.");
      return;
    }
    const hotelId = hotel.id;

    console.log("Testing getInvoicesByHotel for hotelId:", hotelId);
    const invoices = await service.getInvoicesByHotel(hotelId);
    console.log("Success! Found", invoices.length, "invoices.");
  } catch (error: any) {
    console.error("Error in getInvoicesByHotel:");
    console.error(error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
