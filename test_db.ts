import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Testing invoice query...");
    const invoice = await prisma.invoice.findFirst();
    console.log("Success:", !!invoice);
    
    console.log("Testing invoice creation simulation (not saving)...");
    
    // Check fields of invoice model
    const fields = Object.keys(prisma.invoice.fields);
    console.log("Fields in Prisma Invoice model:", fields.join(", "));
  } catch (error) {
    console.error("Error connecting or querying invoices:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
