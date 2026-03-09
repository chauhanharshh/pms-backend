import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { MENU_DATA } from './src/constants/menuData';

const menuData = MENU_DATA;
;

async function reseed() {
    console.log("Starting universal menu re-seed...");
    const hotels = await prisma.hotel.findMany();
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    const userId = adminUser?.id || "system";

    for (const hotel of hotels) {
        console.log(`Processing hotel: ${hotel.name} (${hotel.id})`);

        // Remove existing to ensure clean replacement
        await prisma.restaurantMenu.deleteMany({ where: { hotelId: hotel.id } });
        await prisma.restaurantCategory.deleteMany({ where: { hotelId: hotel.id } });

        let sortOrder = 0;
        for (const catData of menuData) {
            const category = await prisma.restaurantCategory.create({
                data: {
                    hotelId: hotel.id,
                    name: catData.category,
                    sortOrder: sortOrder++,
                    createdBy: userId,
                    updatedBy: userId
                }
            });

            for (const item of catData.items) {
                let isVeg = true;
                const nameLower = item.name.toLowerCase();
                if (nameLower.includes('chicken') || nameLower.includes('mutton') || nameLower.includes('fish') || nameLower.includes('egg') || nameLower.includes('omlette')) {
                    isVeg = false;
                }

                await prisma.restaurantMenu.create({
                    data: {
                        hotelId: hotel.id,
                        categoryId: category.id,
                        itemName: item.name,
                        price: item.price,
                        taxRate: 5,
                        isAvailable: true,
                        isVeg: isVeg,
                        createdBy: userId,
                        updatedBy: userId
                    }
                });
            }
        }
        console.log(`  Done seeding for ${hotel.name}`);
    }
    console.log("All hotels re-seeded successfully.");
}

reseed().catch(console.error).finally(() => prisma.$disconnect());
