import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function prepareForDelivery() {
  console.log("Preparing project for fresh delivery...");

  // Child/dependent transaction tables first
  const restaurantKOT = await prisma.restaurantKOT.deleteMany({});
  const restaurantOrderItem = await prisma.restaurantOrderItem.deleteMany({});

  // Invoices depend on Bill and RestaurantOrder; delete first
  const invoice = await prisma.invoice.deleteMany({});

  // Day closing transaction history
  const restaurantDayClosing = await prisma.restaurantDayClosing.deleteMany({});
  const dayClosing = await prisma.dayClosing.deleteMany({});

  // Financial/charge transaction tables
  const advancePayment = await prisma.advancePayment.deleteMany({});
  const miscCharge = await prisma.miscCharge.deleteMany({});
  const expense = await prisma.expense.deleteMany({});
  const paymentVoucher = await prisma.paymentVoucher.deleteMany({});

  // Hotel side transaction tables
  const bill = await prisma.bill.deleteMany({});

  // Restaurant transaction header rows (kept out of master data)
  const restaurantOrder = await prisma.restaurantOrder.deleteMany({});

  // Booking/check-in transaction rows
  const booking = await prisma.booking.deleteMany({});

  // Ensure all rooms are ready for fresh check-ins
  const roomStatusReset = await prisma.room.updateMany({
    data: { status: "vacant" },
  });

  const deleted = {
    restaurantKOT: restaurantKOT.count,
    restaurantOrderItem: restaurantOrderItem.count,
    invoice: invoice.count,
    restaurantDayClosing: restaurantDayClosing.count,
    dayClosing: dayClosing.count,
    advancePayment: advancePayment.count,
    miscCharge: miscCharge.count,
    expense: expense.count,
    paymentVoucher: paymentVoucher.count,
    bill: bill.count,
    restaurantOrder: restaurantOrder.count,
    booking: booking.count,
    roomStatusReset: roomStatusReset.count,
  };

  const verify = {
    transaction: {
      booking: await prisma.booking.count(),
      bill: await prisma.bill.count(),
      invoice: await prisma.invoice.count(),
      restaurantKOT: await prisma.restaurantKOT.count(),
      restaurantOrder: await prisma.restaurantOrder.count(),
      restaurantOrderItem: await prisma.restaurantOrderItem.count(),
      dayClosing: await prisma.dayClosing.count(),
      restaurantDayClosing: await prisma.restaurantDayClosing.count(),
      advancePayment: await prisma.advancePayment.count(),
      miscCharge: await prisma.miscCharge.count(),
      expense: await prisma.expense.count(),
      paymentVoucher: await prisma.paymentVoucher.count(),
    },
    preservedMasterData: {
      users: await prisma.user.count(),
      hotels: await prisma.hotel.count(),
      rooms: await prisma.room.count(),
      roomTypes: await prisma.roomType.count(),
      restaurantCategories: await prisma.restaurantCategory.count(),
      restaurantMenu: await prisma.restaurantMenu.count(),
      companies: await prisma.company.count(),
      stewards: await prisma.hotelSteward.count(),
      systemSettings: await prisma.systemSettings.count(),
    },
    roomStatus: await prisma.room.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  };

  console.log("Deleted counts:", deleted);
  console.log("Verification snapshot:", verify);
  console.log("Delivery cleanup complete. Logic and master/config data left intact.");
}

prepareForDelivery()
  .catch((error) => {
    console.error("Delivery cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
