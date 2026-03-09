import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      email: 'admin@pms.com',
      phone: '+1234567890',
      role: 'admin',
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', admin.username);

  // Create demo hotel
  const demoHotel = await prisma.hotel.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Grand Plaza Hotel',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      phone: '+91-22-12345678',
      email: 'info@grandplaza.com',
      gstNumber: '27AABCU9603R1ZX',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      taxRate: 12.0,
      currency: 'INR',
      isActive: true,
      createdBy: admin.id,
    },
  });

  console.log('✅ Demo hotel created:', demoHotel.name);

  // Create hotel manager
  const managerPassword = await bcrypt.hash('manager123', 10);
  
  const manager = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      passwordHash: managerPassword,
      fullName: 'Hotel Manager',
      email: 'manager@grandplaza.com',
      phone: '+91-9876543210',
      role: 'hotel_manager',
      hotelId: demoHotel.id,
      isActive: true,
      createdBy: admin.id,
    },
  });

  console.log('✅ Hotel manager created:', manager.username);

  // Create hotel user (front desk)
  const userPassword = await bcrypt.hash('user123', 10);
  
  const hotelUser = await prisma.user.upsert({
    where: { username: 'frontdesk' },
    update: {},
    create: {
      username: 'frontdesk',
      passwordHash: userPassword,
      fullName: 'Front Desk Staff',
      email: 'frontdesk@grandplaza.com',
      phone: '+91-9876543211',
      role: 'hotel_user',
      hotelId: demoHotel.id,
      isActive: true,
      createdBy: admin.id,
    },
  });

  console.log('✅ Hotel user created:', hotelUser.username);

  // Create room types
  const deluxeType = await prisma.roomType.create({
    data: {
      hotelId: demoHotel.id,
      name: 'Deluxe Room',
      description: 'Spacious deluxe room with city view',
      basePrice: 5000.00,
      maxOccupancy: 2,
      amenities: JSON.stringify(['AC', 'TV', 'WiFi', 'Mini Bar']),
      createdBy: admin.id,
    },
  });

  const suiteType = await prisma.roomType.create({
    data: {
      hotelId: demoHotel.id,
      name: 'Executive Suite',
      description: 'Luxurious suite with separate living area',
      basePrice: 10000.00,
      maxOccupancy: 4,
      amenities: JSON.stringify(['AC', 'TV', 'WiFi', 'Mini Bar', 'Bathtub', 'Balcony']),
      createdBy: admin.id,
    },
  });

  console.log('✅ Room types created');

  // Create rooms
  const rooms = [
    { roomNumber: '101', floor: 1, typeId: deluxeType.id, price: 5000 },
    { roomNumber: '102', floor: 1, typeId: deluxeType.id, price: 5000 },
    { roomNumber: '103', floor: 1, typeId: deluxeType.id, price: 5000 },
    { roomNumber: '201', floor: 2, typeId: suiteType.id, price: 10000 },
    { roomNumber: '202', floor: 2, typeId: suiteType.id, price: 10000 },
  ];

  for (const room of rooms) {
    await prisma.room.create({
      data: {
        hotelId: demoHotel.id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        typeId: room.typeId,
        status: 'vacant',
        basePrice: room.price,
        maxOccupancy: room.roomNumber.startsWith('2') ? 4 : 2,
        createdBy: admin.id,
      },
    });
  }

  console.log('✅ Rooms created');

  // Create restaurant categories
  const starterCategory = await prisma.restaurantCategory.create({
    data: {
      hotelId: demoHotel.id,
      name: 'Starters',
      sortOrder: 1,
      createdBy: admin.id,
    },
  });

  const mainCourseCategory = await prisma.restaurantCategory.create({
    data: {
      hotelId: demoHotel.id,
      name: 'Main Course',
      sortOrder: 2,
      createdBy: admin.id,
    },
  });

  // Create menu items
  await prisma.restaurantMenu.createMany({
    data: [
      {
        hotelId: demoHotel.id,
        categoryId: starterCategory.id,
        itemName: 'Paneer Tikka',
        price: 350.00,
        taxRate: 5.00,
        isVeg: true,
        isAvailable: true,
        createdBy: admin.id,
      },
      {
        hotelId: demoHotel.id,
        categoryId: mainCourseCategory.id,
        itemName: 'Butter Chicken',
        price: 550.00,
        taxRate: 5.00,
        isVeg: false,
        isAvailable: true,
        createdBy: admin.id,
      },
    ],
  });

  console.log('✅ Restaurant menu created');

  console.log('\n🎉 Seeding completed successfully!\n');
  console.log('📋 Login Credentials:');
  console.log('─────────────────────────────────');
  console.log('Admin:');
  console.log('  Username: admin');
  console.log('  Password: admin123');
  console.log('\nManager:');
  console.log('  Username: manager');
  console.log('  Password: manager123');
  console.log('\nFront Desk:');
  console.log('  Username: frontdesk');
  console.log('  Password: user123');
  console.log('─────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
