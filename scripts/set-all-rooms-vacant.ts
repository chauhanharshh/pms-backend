import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setAllRoomsVacant() {
  const before = await prisma.room.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const updated = await prisma.room.updateMany({
    data: { status: "vacant" },
  });

  const after = await prisma.room.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  console.log("Room status counts before:", before);
  console.log("Rooms updated to vacant:", updated.count);
  console.log("Room status counts after:", after);
}

setAllRoomsVacant()
  .catch((error) => {
    console.error("Failed to set rooms vacant:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
