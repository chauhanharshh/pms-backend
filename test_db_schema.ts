import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'invoices'
    `;
    const fs = require('fs');
    fs.writeFileSync('test_db_schema.json', JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error("Error querying DB:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
