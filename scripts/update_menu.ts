import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const menuData = [
    {
        category: "Good Morning",
        items: [
            { name: "Tea", price: 20 },
            { name: "Spl. Tea", price: 35 },
            { name: "Masala Tea", price: 25 },
            { name: "Lemon Tea", price: 20 },
            { name: "Coffee", price: 50 },
            { name: "Special Coffee", price: 70 },
            { name: "Hot Chocolate", price: 70 },
            { name: "Bournvita", price: 70 },
            { name: "Black Coffee", price: 40 },
            { name: "Hot Milk", price: 50 }
        ]
    },
    {
        category: "Breakfast",
        items: [
            { name: "Butter Toast", price: 50 },
            { name: "Club Sandwich", price: 100 },
            { name: "Jam Toast", price: 70 },
            { name: "Jam Butter Toast", price: 70 },
            { name: "Veg. Toast", price: 70 },
            { name: "Paneer Toast", price: 100 },
            { name: "Veg. Sandwich", price: 70 },
            { name: "Paneer Sandwich", price: 100 },
            { name: "Puri Bhaji (4 Pcs.)", price: 150 },
            { name: "Aloo Parantha (2 Pcs.) + Curd", price: 150 },
            { name: "Plain Parantha (2 Pcs.) + Curd", price: 120 },
            { name: "Paneer Parantha (2 Pcs.) + Curd", price: 170 },
            { name: "Muli Parantha (2 Pcs.) + Curd", price: 140 },
            { name: "Gobi Parantha (2 Pcs.) + Curd", price: 150 },
            { name: "Milk With Cornflakes", price: 100 }
        ]
    },
    {
        category: "Special",
        items: [
            { name: "Indian Breakfast (2 Pcs. Parantha, 1 Butter Toast, 2 Tea)", price: 220 }
        ]
    },
    {
        category: "Snacks",
        items: [
            { name: "Mix Pakoda", price: 150 },
            { name: "Paneer Pakoda", price: 170 },
            { name: "Onion Pakoda", price: 120 },
            { name: "Finger Chips", price: 80 },
            { name: "Paneer Cutlet", price: 150 },
            { name: "Veg. Cutlet", price: 130 },
            { name: "Peanut Masala", price: 120 },
            { name: "Papad Roll", price: 150 },
            { name: "Chana Chilli", price: 150 },
            { name: "Papad Fry", price: 30 },
            { name: "Hara Bhara Kabab", price: 120 },
            { name: "Roasted Papad", price: 25 },
            { name: "Green Peas Jeera Fry", price: 150 },
            { name: "Masala Papad", price: 70 }
        ]
    },
    {
        category: "Chinese Flavours",
        items: [
            { name: "Tomato Soup", price: 100 },
            { name: "Veg. Soup", price: 100 },
            { name: "Veg. Noodle Soup", price: 100 },
            { name: "Veg. Sweetcorn", price: 100 },
            { name: "Lemon Ginger Soup", price: 100 },
            { name: "Manchow Soup", price: 100 },
            { name: "Veg. Chowmein Hakka", price: 100 },
            { name: "Mix Chowmein Hakka", price: 100 },
            { name: "Veg. Manchurian Dry", price: 150 },
            { name: "Veg. Manchurian Gravy", price: 170 },
            { name: "Maggi", price: 50 },
            { name: "Veg. Maggi", price: 70 },
            { name: "Chilli Potato", price: 120 },
            { name: "Chilli Paneer", price: 270 }
        ]
    },
    {
        category: "Khusboo",
        items: [
            { name: "Steam Rice", price: 100 },
            { name: "Jeera Rice", price: 110 },
            { name: "Peas Pulao", price: 130 },
            { name: "Veg. Pulao", price: 120 },
            { name: "Kholapuri Pulao", price: 150 },
            { name: "Paneer Pulao", price: 160 },
            { name: "Veg. Biriyani with Raita", price: 170 },
            { name: "Kashmiri Pulao", price: 200 },
            { name: "Veg. Fried Rice", price: 120 },
            { name: "Khichdi", price: 150 }
        ]
    },
    {
        category: "Tawa Se",
        items: [
            { name: "Roti", price: 15 },
            { name: "Butter Roti", price: 20 },
            { name: "Missi Roti", price: 30 },
            { name: "Parantha Sada", price: 40 },
            { name: "Aloo Parantha", price: 60 },
            { name: "Gobi Parantha", price: 60 },
            { name: "Muli Parantha", price: 60 },
            { name: "Paneer Parantha", price: 80 },
            { name: "Mix Parantha", price: 60 },
            { name: "1 Pc. Puri", price: 15 }
        ]
    },
    {
        category: "Staple",
        items: [
            { name: "Kadai Paneer", price: 280 },
            { name: "Paneer Korma", price: 260 },
            { name: "Paneer Butter Masala", price: 280 },
            { name: "Paneer Bhujia", price: 260 },
            { name: "Sahi Paneer", price: 260 },
            { name: "Mushroom Paneer", price: 260 },
            { name: "Paneer Pasinda", price: 260 },
            { name: "Mutter Paneer", price: 260 }
        ]
    },
    {
        category: "Main Course",
        items: [
            { name: "Paneer Do Piyaja", price: 260 },
            { name: "Palak Paneer", price: 280 },
            { name: "Paneer Masala", price: 260 },
            { name: "Dal Fry", price: 140 },
            { name: "Dal Butter Fry", price: 160 },
            { name: "Dal Makhani", price: 180 },
            { name: "Dal Tadka", price: 150 },
            { name: "Gobi Masala", price: 170 },
            { name: "Masala Kofta", price: 180 },
            { name: "Bhindi Masala", price: 170 },
            { name: "Green Peas Curry", price: 150 },
            { name: "Aloo Dum", price: 150 },
            { name: "Aloo Gobhi", price: 150 },
            { name: "Kashmiri Aloo Dum", price: 160 },
            { name: "Aloo Mattar", price: 150 },
            { name: "Aloo Jeera", price: 130 },
            { name: "Mix Vegetables", price: 170 },
            { name: "Malai Kofta", price: 270 },
            { name: "Navratan Korma", price: 280 },
            { name: "Baingan Bharta", price: 150 },
            { name: "Chana Masala", price: 170 },
            { name: "Mushroom Masala", price: 230 },
            { name: "Mushroom Matar", price: 220 },
            { name: "Aloo Shimlamirch", price: 150 },
            { name: "Boil Veg.", price: 150 },
            { name: "Veg. Kofta", price: 180 }
        ]
    },
    {
        category: "Combo",
        items: [
            { name: "Jeera Rice with Dal Makhani", price: 220 },
            { name: "Veg. Chowmein & Veg. Manchurian Gravy", price: 250 },
            { name: "Veg. Fried Rice & Paneer Masala", price: 260 },
            { name: "Puri & Aludam (4 Pcs.)", price: 170 }
        ]
    },
    {
        category: "Salad",
        items: [
            { name: "Green Salad", price: 60 },
            { name: "Onion Salad", price: 50 },
            { name: "Fruit Salad", price: 150 },
            { name: "Fruit Salad with Icecream", price: 180 }
        ]
    },
    {
        category: "Sweetness",
        items: [
            { name: "Rasgulla (2 Pcs.)", price: 70 },
            { name: "Gulab Jamun (2 Pcs.)", price: 70 },
            { name: "Rasmalai", price: 120 },
            { name: "Kheer", price: 80 },
            { name: "Special Kheer", price: 100 }
        ]
    },
    {
        category: "Raita Relish",
        items: [
            { name: "Plain Curd", price: 60 },
            { name: "Bundi Raita", price: 70 },
            { name: "Mix Raita", price: 80 },
            { name: "Aloo Raita", price: 70 },
            { name: "Pineapple Raita", price: 100 },
            { name: "Special Thali", price: 300 }
        ]
    },
    {
        category: "Cool Temptation",
        items: [
            { name: "Vanilla Icecream", price: 50 },
            { name: "Chocolate", price: 60 },
            { name: "Two in One", price: 60 },
            { name: "Special", price: 100 },
            { name: "Ice Cream Shakes", price: 90 },
            { name: "Cheese With Pineapple Stick", price: 120 }
        ]
    },
    {
        category: "Refresh",
        items: [
            { name: "Cold Drinks (700 ml)", price: 60 },
            { name: "Mineral Water (1 Ltr.)", price: 25 },
            { name: "Jal Jeera", price: 25 },
            { name: "Fresh Lime Water", price: 30 },
            { name: "Fresh Lime Soda", price: 40 },
            { name: "Cold Coffee", price: 60 },
            { name: "Cold Coffee with Ice Cream", price: 80 },
            { name: "Masala Cold Drinks", price: 50 },
            { name: "Soda (500 ml.)", price: 50 },
            { name: "Rose Milk", price: 70 },
            { name: "Banana Shake", price: 70 },
            { name: "Fruit Juice", price: 70 },
            { name: "Ice Bucket", price: 50 },
            { name: "Lassi (Sweet / Salt)", price: 60 }
        ]
    },
    {
        category: "Water",
        items: [
            { name: "Boil Water Bottle", price: 20 },
            { name: "Boil Water Glass", price: 10 }
        ]
    }
];

async function main() {
    console.log('Starting menu update...');

    // 1. Get the hotel
    const hotel = await prisma.hotel.findFirst();
    if (!hotel) {
        console.error('No hotel found in database.');
        return;
    }
    const hotelId = hotel.id;
    console.log(`Updating menu for hotel: ${hotel.name} (${hotelId})`);

    // 2. Clear existing menu items and categories
    // Delete items first due to foreign key constraint
    const deletedItems = await prisma.restaurantMenu.deleteMany({
        where: { hotelId }
    });
    console.log(`Deleted ${deletedItems.count} existing menu items.`);

    const deletedCategories = await prisma.restaurantCategory.deleteMany({
        where: { hotelId }
    });
    console.log(`Deleted ${deletedCategories.count} existing categories.`);

    // 3. Insert new data
    for (let i = 0; i < menuData.length; i++) {
        const catData = menuData[i];
        const category = await prisma.restaurantCategory.create({
            data: {
                hotelId,
                name: catData.category,
                sortOrder: i,
                isActive: true
            }
        });
        console.log(`Created category: ${category.name}`);

        for (const item of catData.items) {
            await prisma.restaurantMenu.create({
                data: {
                    hotelId,
                    categoryId: category.id,
                    itemName: item.name,
                    price: item.price,
                    taxRate: 5.0,
                    isVeg: true,
                    isAvailable: true
                }
            });
        }
        console.log(`  Added ${catData.items.length} items to ${category.name}`);
    }

    console.log('Menu update completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
