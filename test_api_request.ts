import { PrismaClient } from '@prisma/client';
import { JwtUtil } from './src/utils/jwt';
import axios from 'axios';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found.');
      return;
    }

    const token = JwtUtil.sign({
      userId: user.id,
      hotelId: user.hotelId || undefined,
      role: user.role
    });

    console.log("Testing GET /api/v1/invoices with token");
    try {
      const resp = await axios.get('http://localhost:5000/api/v1/invoices', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log("GET Response:", resp.status, resp.data);
    } catch (err: any) {
      console.error("GET Error:", err.response?.status, err.response?.data);
    }

    console.log("\nTesting POST /api/v1/invoices with token");
    try {
      // Find a bill
      let billId = (await prisma.bill.findFirst())?.id;
      const resp2 = await axios.post('http://localhost:5000/api/v1/invoices', { billId }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log("POST Response:", resp2.status, resp2.data);
    } catch (err: any) {
      console.error("POST Error:", err.response?.status, err.response?.data);
    }

  } catch (error: any) {
    console.error("Error setting up test:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
