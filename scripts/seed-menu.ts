import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { MENU_DATA } from '../src/constants/menuData';

const menuData = MENU_DATA;
;

async function main() {
    console.log('🚀 Starting menu replacement script...');

    // 1. Get first hotel
    const hotel = await prisma.hotel.findFirst();
    if (!hotel) {
        console.error('❌ No hotel found in database. Please run the main seed script first.');
        return;
    }
    const hotelId = hotel.id;

    // 2. Get any admin user
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    const adminId = admin ? admin.id : null;

    console.log(`🏨 Using Hotel: ${hotel.name} (${hotelId})`);

    // 3. Delete existing menu items and categories
    console.log('🧹 Cleaning up existing menu data and dependent records...');

    // Delete in order of dependence
    await prisma.restaurantKOT.deleteMany({ where: { hotelId } });

    // Clear invoice reference
    await prisma.invoice.updateMany({
        where: { hotelId, restaurantOrderId: { not: null } },
        data: { restaurantOrderId: null }
    });

    await prisma.restaurantOrderItem.deleteMany({
        where: { order: { hotelId } }
    });

    await prisma.restaurantOrder.deleteMany({ where: { hotelId } });

    await prisma.restaurantMenu.deleteMany({ where: { hotelId } });
    await prisma.restaurantCategory.deleteMany({ where: { hotelId } });

    // 4. Insert new data
    console.log('🍱 Inserting new menu data...');

    for (let i = 0; i < menuData.length; i++) {
        const catData = menuData[i];

        // Create Category
        const category = await prisma.restaurantCategory.create({
            data: {
                hotelId,
                name: catData.category,
                sortOrder: i + 1,
                createdBy: adminId,
            },
        });

        // Create Items
        await prisma.restaurantMenu.createMany({
            data: catData.items.map(item => ({
                hotelId,
                categoryId: category.id,
                itemName: item.name,
                price: item.price,
                taxRate: 5.00,
                isVeg: true,
                isAvailable: true,
                createdBy: adminId,
            })),
        });

        console.log(`✅ Category seeded: ${catData.category} (${catData.items.length} items)`);
    }

    console.log('\n🎉 Menu replacement completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Script failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
