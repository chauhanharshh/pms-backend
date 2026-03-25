const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hotels = await prisma.hotel.findMany({
    select: {
      id: true,
      name: true,
      posBossMode: true,
      adminId: true,
      createdBy: true,
    }
  });
  console.log(JSON.stringify(hotels, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
