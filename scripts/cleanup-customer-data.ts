import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanCustomerData() {
  const result = await prisma.$transaction(async (tx) => {
    // Restaurant side
    const restaurantKots = await tx.restaurantKOT.deleteMany({});

    // Invoice side (includes both ROOM and RESTAURANT invoice rows)
    const invoices = await tx.invoice.deleteMany({});

    // Hotel side
    const bills = await tx.bill.deleteMany({});
    const bookings = await tx.booking.deleteMany({});

    return {
      restaurantKots: restaurantKots.count,
      invoices: invoices.count,
      bills: bills.count,
      bookings: bookings.count,
    };
  });

  console.log("Cleanup summary:", result);
  console.log("All customer data deleted successfully.");
  console.log("Nothing else was touched.");
}

cleanCustomerData()
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
