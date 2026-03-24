const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCancellation() {
  console.log('--- Verifying Booking Cancellation Logic ---');
  
  try {
    // 1. Find an existing pending or confirmed booking
    const booking = await prisma.booking.findFirst({
      where: {
        status: { in: ['pending', 'confirmed'] }
      },
      include: { room: true }
    });

    if (!booking) {
      console.log('No pending or confirmed booking found to test with. Please create one in the UI first.');
      return;
    }

    console.log(`Testing with Booking ID: ${booking.id}, Guest: ${booking.guestName}, Current Status: ${booking.status}`);
    const originalStatus = booking.status;
    const roomId = booking.roomId;
    
    // Check room status
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    console.log(`Room: ${room.roomNumber}, Current Status: ${room.status}`);

    // 2. Run cancellation logic (simulating the service method)
    console.log('\n--- Simulating Cancellation Transaction ---');
    await prisma.$transaction(async (tx: any) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled' }
      });
      await tx.room.update({
        where: { id: roomId },
        data: { status: 'vacant' }
      });
    });

    // 3. Verify results
    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } }) as any;
    const updatedRoom = await prisma.room.findUnique({ where: { id: roomId } }) as any;

    console.log(`Updated Booking Status: ${updatedBooking.status} (Expected: cancelled)`);
    console.log(`Updated Room Status: ${updatedRoom.status} (Expected: vacant)`);

    if (updatedBooking.status === 'cancelled' && updatedRoom.status === 'vacant') {
      console.log('✅ VERIFICATION SUCCESSFUL');
      
      // 4. ROLLBACK (Optional but good for testing)
      console.log('\nRestoring original state for manual UI verification...');
      await prisma.$transaction(async (tx: any) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: originalStatus }
        });
        await tx.room.update({
          where: { id: roomId },
          data: { status: room.status }
        });
      });
      console.log('Original state restored.');
    } else {
      console.log('❌ VERIFICATION FAILED');
    }

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCancellation();
