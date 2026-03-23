import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedMenu() {
  // Find hotel:
  const hotel = await prisma.hotel.findFirst({
    where: { name: { contains: 'Suvidha' } }
  });

  if (!hotel) {
    console.log('Hotel not found!');
    return;
  }

  console.log('Seeding menu for:', hotel.name);

  // Find or create categories and items:
  const menuData = [
    {
      category: 'Snacks',
      items: [
        { name: 'Mix Pakoda', price: 150 },
        { name: 'Paneer Pakoda', price: 170 },
        { name: 'Onion Pakoda', price: 120 },
        { name: 'Cury Pakoda', price: 150 },
        { name: 'Finger Chips', price: 80 },
        { name: 'Paneer Cutlet', price: 150 },
        { name: 'Veg Cutlet', price: 130 },
        { name: 'Peanut Masala', price: 120 },
        { name: 'Papad Roll', price: 150 },
        { name: 'Chana Chilli', price: 150 },
        { name: 'Papad Fry', price: 30 },
        { name: 'Hara Bhara Kabab', price: 150 },
        { name: 'Roasted Papad', price: 25 },
        { name: 'Green Peas Jeera Fry', price: 150 },
        { name: 'Masala Papad', price: 70 },
      ]
    },
    {
      category: 'Salad',
      items: [
        { name: 'Green Salad', price: 70 },
        { name: 'Onion Salad', price: 50 },
        { name: 'Fruit Salad', price: 180 },
        { name: 'Fruit Salad with Ice Cream', price: 200 },
      ]
    },
    {
      category: 'Sweets',
      items: [
        { name: 'Rasgulla (2 pcs)', price: 70 },
        { name: 'Gulab Jamun (2 pcs)', price: 70 },
        { name: 'Rasmalai', price: 140 },
        { name: 'Kheer', price: 80 },
        { name: 'Special Kheer', price: 100 },
        { name: 'Special Rasgulla', price: 100 },
      ]
    },
    {
      category: 'Chinese & Soups',
      items: [
        { name: 'Tomato Soup', price: 100 },
        { name: 'Veg Soup', price: 100 },
        { name: 'Veg Noodle Soup', price: 100 },
        { name: 'Veg Sweet Corn Soup', price: 100 },
        { name: 'Lemon Ginger Soup', price: 100 },
        { name: 'Manchow Soup', price: 100 },
        { name: 'Baby Corn Soup', price: 70 },
        { name: 'Mix Chowmein Hakka', price: 100 },
        { name: 'Veg Manchurian Dry', price: 150 },
        { name: 'Veg Manchurian Gravy', price: 170 },
        { name: 'Maggi', price: 50 },
        { name: 'Veg Maggi', price: 70 },
        { name: 'Chilli Potato', price: 120 },
        { name: 'Chilli Paneer', price: 290 },
      ]
    },
    {
      category: 'Beverages',
      items: [
        { name: 'Tea', price: 25 },
        { name: 'Special Tea', price: 35 },
        { name: 'Masala Tea', price: 30 },
        { name: 'Lemon Tea', price: 25 },
        { name: 'Coffee', price: 50 },
        { name: 'Special Coffee', price: 60 },
        { name: 'Hot Chocolate', price: 70 },
        { name: 'Bournvita', price: 80 },
        { name: 'Black Coffee', price: 40 },
        { name: 'Hot Milk', price: 50 },
        { name: 'Cold Coffee', price: 60 },
        { name: 'Cold Coffee with Ice Cream', price: 100 },
        { name: 'Special Lassi', price: 60 },
        { name: 'Cold Drink (700 ml)', price: 60 },
        { name: 'Masala Cold Drink', price: 50 },
        { name: 'Mineral Water', price: 25 },
        { name: 'Jal Jeera', price: 25 },
        { name: 'Fresh Lime Water', price: 30 },
        { name: 'Fresh Lime Soda', price: 50 },
        { name: 'Soda', price: 50 },
        { name: 'Rose Milk', price: 80 },
        { name: 'Banana Shake', price: 70 },
        { name: 'Fruit Juice', price: 80 },
        { name: 'Ice Bucket', price: 80 },
        { name: 'Lassi (Sweet/Salt)', price: 60 },
        { name: 'Buttermilk', price: 50 },
      ]
    },
    {
      category: 'Breakfast',
      items: [
        { name: 'Butter Toast', price: 60 },
        { name: 'Bread Butter', price: 50 },
        { name: 'Club Sandwich', price: 110 },
        { name: 'Jam Toast', price: 70 },
        { name: 'Butter Toast Veg', price: 70 },
        { name: 'Toast Paneer', price: 90 },
        { name: 'Toast Veg', price: 100 },
        { name: 'Sandwich Paneer', price: 70 },
        { name: 'Sandwich', price: 100 },
        { name: 'Puri Bhaji', price: 150 },
        { name: 'Aloo Paratha (2 pcs + curd)', price: 150 },
        { name: 'Plain Paratha (2 pcs + curd)', price: 120 },
        { name: 'Paneer Paratha (2 pcs + curd)', price: 170 },
        { name: 'Muli Paratha (2 pcs + curd)', price: 140 },
        { name: 'Gobi Paratha (2 pcs + curd)', price: 150 },
        { name: 'Milk with Cornflakes', price: 100 },
        { name: 'Indian Breakfast', price: 220 },
        { name: 'Poha', price: 100 },
        { name: 'Mix Paratha (2 pcs + curd)', price: 150 },
      ]
    },
    {
      category: 'Rice',
      items: [
        { name: 'Steam Rice', price: 100 },
        { name: 'Jeera Rice', price: 110 },
        { name: 'Peas Pulao', price: 130 },
        { name: 'Veg Pulao', price: 130 },
        { name: 'Kolhapuri Pulao', price: 150 },
        { name: 'Paneer Pulao', price: 170 },
        { name: 'Veg Biryani with Raita', price: 170 },
        { name: 'Kashmiri Pulao', price: 200 },
        { name: 'Veg Fried Rice', price: 130 },
        { name: 'Khichdi', price: 150 },
        { name: 'Veg Biryani', price: 130 },
      ]
    },
    {
      category: 'Dal',
      items: [
        { name: 'Dal Fry', price: 150 },
        { name: 'Dal Butter Fry', price: 160 },
        { name: 'Dal Makhani', price: 180 },
        { name: 'Dal Tadka', price: 160 },
      ]
    },
    {
      category: 'Main Course',
      items: [
        { name: 'Kadai Paneer', price: 300 },
        { name: 'Paneer Korma', price: 300 },
        { name: 'Paneer Butter Masala', price: 300 },
        { name: 'Paneer Bhujia', price: 300 },
        { name: 'Shahi Paneer', price: 300 },
        { name: 'Mushroom Paneer', price: 300 },
        { name: 'Paneer Pasinda', price: 300 },
        { name: 'Mutter Paneer', price: 300 },
        { name: 'Paneer Do Pyaja', price: 300 },
        { name: 'Palak Paneer', price: 300 },
        { name: 'Paneer Masala', price: 300 },
        { name: 'Gobi Masala', price: 170 },
        { name: 'Masala Kofta', price: 180 },
        { name: 'Bhindi Masala', price: 170 },
        { name: 'Green Peas Curry', price: 170 },
        { name: 'Aloo Dum', price: 180 },
        { name: 'Aloo Gobhi', price: 120 },
        { name: 'Kashmiri Aloo Dum', price: 180 },
        { name: 'Aloo Matar', price: 180 },
        { name: 'Aloo Jeera', price: 150 },
        { name: 'Mix Vegetables', price: 170 },
        { name: 'Malai Kofta', price: 270 },
        { name: 'Navratan Korma', price: 280 },
        { name: 'Baingan Bharta', price: 150 },
        { name: 'Chana Masala', price: 180 },
        { name: 'Mushroom Masala', price: 230 },
        { name: 'Mushroom Matar', price: 220 },
        { name: 'Aloo Shimla Mirch', price: 150 },
        { name: 'Boiled Veg', price: 150 },
        { name: 'Veg Kofta', price: 180 },
        { name: 'Lemon', price: 10 },
      ]
    },
    {
      category: 'Others',
      items: [
        { name: 'Butter (1/4)', price: 20 },
        { name: 'Butter (1/2)', price: 30 },
        { name: 'Paneer Papdi', price: 200 },
        { name: 'Sabudana Khichdi', price: 150 },
        { name: 'Dahi Ke Shole', price: 250 },
        { name: 'Stuffed Potato', price: 250 },
        { name: 'Buffet Dinner', price: 375 },
        { name: 'Buffet Lunch', price: 375 },
        { name: 'Mushroom Chilli', price: 250 },
      ]
    },
    {
      category: 'Combos',
      items: [
        { name: 'Jeera Rice + Dal Makhani', price: 250 },
        { name: 'Veg Chowmein + Manchurian', price: 270 },
        { name: 'Fried Rice + Paneer Masala', price: 300 },
        { name: 'Puri & Aloo Dum (4 pcs)', price: 200 },
        { name: 'Special Thali', price: 300 },
      ]
    },
    {
      category: 'Tawa Items',
      items: [
        { name: 'Roti', price: 15 },
        { name: 'Butter Roti', price: 20 },
        { name: 'Missi Roti', price: 30 },
        { name: 'Plain Paratha', price: 50 },
        { name: 'Aloo Paratha', price: 60 },
        { name: 'Onion Paratha', price: 60 },
        { name: 'Gobi Paratha', price: 60 },
        { name: 'Muli Paratha', price: 60 },
        { name: 'Paneer Paratha', price: 80 },
        { name: 'Mix Paratha', price: 60 },
        { name: 'Puri (per piece)', price: 15 },
      ]
    },
    {
      category: 'Raita',
      items: [
        { name: 'Plain Curd', price: 80 },
        { name: 'Boondi Raita', price: 100 },
        { name: 'Mix Raita', price: 100 },
        { name: 'Aloo Raita', price: 70 },
        { name: 'Pineapple Raita', price: 100 },
      ]
    },
    {
      category: 'Ice Cream & Shakes',
      items: [
        { name: 'Vanilla Ice Cream', price: 50 },
        { name: 'Chocolate Ice Cream', price: 60 },
        { name: 'Two-in-One Ice Cream', price: 60 },
        { name: 'Special Ice Cream', price: 100 },
        { name: 'Ice Cream Shake', price: 90 },
        { name: 'Cheese with Pineapple', price: 120 },
      ]
    },
  ];

  // Seed each category and items:
  for (const categoryData of menuData) {
    console.log(`Seeding category: ${categoryData.category}`);

    // Find or create category:
    let category = await prisma.restaurantCategory.findFirst({
      where: {
        name: categoryData.category,
        hotelId: hotel.id
      }
    });

    if (!category) {
      category = await prisma.restaurantCategory.create({
        data: {
          name: categoryData.category,
          hotelId: hotel.id
        }
      });
    }

    // Create items:
    for (const item of categoryData.items) {
      const existing = await prisma.restaurantMenu.findFirst({
        where: {
          itemName: item.name,
          hotelId: hotel.id
        }
      });

      if (!existing) {
        await prisma.restaurantMenu.create({
          data: {
            itemName: item.name,
            price: item.price,
            categoryId: category.id,
            hotelId: hotel.id,
            isAvailable: true,
            description: 'Delightful restaurant special preparation.',
          }
        });
      }
    }
  }

  console.log('✅ Menu seeded successfully!');
  console.log(`Total categories: ${menuData.length}`);
  console.log(`Total items: ${menuData.reduce((sum, c) => sum + c.items.length, 0)}`);
}

seedMenu()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
