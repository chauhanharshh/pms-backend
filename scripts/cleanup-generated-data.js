/*
  Cleanup script: removes generated/transactional data while preserving
  hotels, users, restaurant categories/menu, rooms and room types.
*/
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting transactional cleanup...');

  await prisma.$transaction(async (tx) => {
    // Child tables first to satisfy FK constraints.
    await tx.restaurantOrderItem.deleteMany({});
    await tx.restaurantKOT.deleteMany({});

    // Generated financial and operational records.
    await tx.invoice.deleteMany({});
    await tx.bill.deleteMany({});
    await tx.advancePayment.deleteMany({});
    await tx.miscCharge.deleteMany({});
    await tx.restaurantOrder.deleteMany({});
    await tx.booking.deleteMany({});

    // Other operational modules.
    await tx.expense.deleteMany({});
    await tx.paymentVoucher.deleteMany({});
    await tx.pettyCash.deleteMany({});
    await tx.liability.deleteMany({});
    await tx.dayClosing.deleteMany({});
    await tx.roomBlock.deleteMany({});

    // Optional non-core masters not requested to preserve.
    await tx.company.deleteMany({});
    await tx.vendor.deleteMany({});
  });

  console.log('Cleanup complete. Preserved: hotels, users, restaurant menu/categories, rooms, room types.');
}

main()
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
