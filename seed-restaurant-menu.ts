import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const menuData = [
    {
        category: "Soups",
        items: [
            { name: "Tomato Soup", price: 120 },
            { name: "Sweet Corn Soup", price: 130 },
            { name: "Hot & Sour Soup", price: 140 },
            { name: "Manchow Soup", price: 140 },
            { name: "Veg Clear Soup", price: 110 },
            { name: "Chicken Clear Soup", price: 160 },
            { name: "Chicken Manchow Soup", price: 170 },
            { name: "Lemon Coriander Soup", price: 130 },
            { name: "Cream of Mushroom Soup", price: 150 },
            { name: "Cream of Chicken Soup", price: 180 },
        ]
    },
    {
        category: "Starters",
        items: [
            { name: "Veg Spring Roll", price: 180 },
            { name: "Paneer Tikka", price: 260 },
            { name: "Veg Manchurian Dry", price: 220 },
            { name: "Chilli Paneer", price: 240 },
            { name: "Hara Bhara Kabab", price: 200 },
            { name: "Chicken Tikka", price: 320 },
            { name: "Chicken Lollipop", price: 300 },
            { name: "Crispy Corn", price: 190 },
            { name: "Fish Fingers", price: 350 },
            { name: "Chilli Chicken", price: 300 },
        ]
    },
    {
        category: "Veg Main Course",
        items: [
            { name: "Paneer Butter Masala", price: 280 },
            { name: "Shahi Paneer", price: 270 },
            { name: "Kadai Paneer", price: 260 },
            { name: "Palak Paneer", price: 250 },
            { name: "Mix Veg Curry", price: 220 },
            { name: "Veg Kolhapuri", price: 230 },
            { name: "Dum Aloo", price: 210 },
            { name: "Malai Kofta", price: 260 },
            { name: "Aloo Gobi", price: 200 },
            { name: "Mushroom Masala", price: 240 },
        ]
    },
    {
        category: "Non-Veg Main Course",
        items: [
            { name: "Butter Chicken", price: 360 },
            { name: "Chicken Curry", price: 320 },
            { name: "Kadai Chicken", price: 340 },
            { name: "Chicken Do Pyaza", price: 330 },
            { name: "Chicken Masala", price: 340 },
            { name: "Mutton Rogan Josh", price: 420 },
            { name: "Mutton Curry", price: 400 },
            { name: "Fish Curry", price: 380 },
            { name: "Egg Curry", price: 220 },
            { name: "Chicken Handi", price: 360 },
        ]
    },
    {
        category: "Rice & Biryani",
        items: [
            { name: "Steam Rice", price: 120 },
            { name: "Jeera Rice", price: 150 },
            { name: "Veg Pulao", price: 180 },
            { name: "Veg Biryani", price: 220 },
            { name: "Paneer Biryani", price: 260 },
            { name: "Chicken Biryani", price: 320 },
            { name: "Mutton Biryani", price: 380 },
            { name: "Egg Biryani", price: 240 },
            { name: "Veg Fried Rice", price: 200 },
            { name: "Chicken Fried Rice", price: 260 },
        ]
    },
    {
        category: "Breads",
        items: [
            { name: "Tandoori Roti", price: 30 },
            { name: "Butter Roti", price: 40 },
            { name: "Plain Naan", price: 60 },
            { name: "Butter Naan", price: 70 },
            { name: "Garlic Naan", price: 80 },
            { name: "Cheese Naan", price: 120 },
            { name: "Lachha Paratha", price: 70 },
            { name: "Aloo Paratha", price: 90 },
            { name: "Paneer Paratha", price: 120 },
            { name: "Missi Roti", price: 60 },
        ]
    },
    {
        category: "Beverages",
        items: [
            { name: "Mineral Water", price: 30 },
            { name: "Masala Tea", price: 40 },
            { name: "Coffee", price: 50 },
            { name: "Cold Coffee", price: 120 },
            { name: "Fresh Lime Soda", price: 80 },
            { name: "Sweet Lassi", price: 90 },
            { name: "Salted Lassi", price: 90 },
            { name: "Mango Shake", price: 120 },
            { name: "Soft Drink", price: 60 },
            { name: "Lemon Iced Tea", price: 110 },
        ]
    },
    {
        category: "Desserts",
        items: [
            { name: "Gulab Jamun", price: 90 },
            { name: "Rasgulla", price: 90 },
            { name: "Gajar Ka Halwa", price: 120 },
            { name: "Ice Cream Vanilla", price: 80 },
            { name: "Ice Cream Chocolate", price: 90 },
            { name: "Ice Cream Strawberry", price: 90 },
            { name: "Brownie with Ice Cream", price: 180 },
            { name: "Kheer", price: 100 },
            { name: "Fruit Custard", price: 110 },
            { name: "Jalebi", price: 100 },
        ]
    }
];

async function seedMenu() {
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!adminUser) throw new Error("No admin user found. Seed an admin first.");

    const hotel = await prisma.hotel.findFirst();
    if (!hotel) throw new Error("No hotel found. Seed a hotel first.");

    const hotelId = hotel.id;
    const userId = adminUser.id;

    let sortOrder = 0;

    for (const catData of menuData) {
        let category = await prisma.restaurantCategory.findFirst({
            where: { hotelId, name: catData.category }
        });

        if (!category) {
            category = await prisma.restaurantCategory.create({
                data: {
                    hotelId,
                    name: catData.category,
                    sortOrder: sortOrder++,
                    createdBy: userId,
                    updatedBy: userId
                }
            });
            console.log(`Created category: ${catData.category}`);
        } else {
            console.log(`Category exists: ${catData.category}`);
            sortOrder++;
        }

        for (const item of catData.items) {
            let menuItem = await prisma.restaurantMenu.findFirst({
                where: { hotelId, categoryId: category.id, itemName: item.name }
            });

            if (!menuItem) {
                // Simple veg/non-veg heuristic
                let isVeg = true;
                const nameLower = item.name.toLowerCase();
                const catLower = catData.category.toLowerCase();
                if (catLower.includes('non-veg') || nameLower.includes('chicken') || nameLower.includes('mutton') || nameLower.includes('fish') || nameLower.includes('egg')) {
                    isVeg = false;
                }

                await prisma.restaurantMenu.create({
                    data: {
                        hotelId,
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
                console.log(`  Added item: ${item.name}`);
            } else {
                console.log(`  Item exists: ${item.name}`);
            }
        }
    }
}

seedMenu().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
