// Script to link all existing hotels to their respective admin's license key
// Run this script in the backend/scripts directory with Node.js after updating as needed

import prisma from '../src/config/database';

async function main() {
  // Get all hotels with an adminId
  const hotels = await prisma.hotel.findMany({
    where: { adminId: { not: null } },
    select: { id: true, adminId: true }
  });

  for (const hotel of hotels) {
    // Find the license for this admin
    const license = await prisma.licenses.findFirst({
      where: { adminId: hotel.adminId },
      orderBy: { createdAt: 'desc' },
    });
    if (!license) {
      console.warn(`No license found for admin ${hotel.adminId} (hotel ${hotel.id})`);
      continue;
    }
    // Update the hotel to store the licenseKey if needed (add a licenseKey field if not present)
    // Or update the license to link to the hotel if needed
    await prisma.licenses.updateMany({
      where: { adminId: hotel.adminId },
      data: { hotelId: hotel.id },
    });
    console.log(`Linked hotel ${hotel.id} to license ${license.licenseKey}`);
  }
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
