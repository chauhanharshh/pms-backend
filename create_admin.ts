import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for admin user...');

    // Check if the role enum accepts 'admin'
    // Prisma generates Enums
    const roleType = 'admin';

    const user = await prisma.user.findUnique({
        where: { username: 'admin' }
    });

    // Auth model uses bcrypt
    const hash = await bcrypt.hash('admin123', 10);

    if (!user) {
        console.log('Admin user not found. Creating...');
        await prisma.user.create({
            data: {
                username: 'admin',
                passwordHash: hash,
                role: roleType as any,
                fullName: 'System Admin',
                isActive: true
            }
        });
        console.log('Admin user created successfully.');
    } else {
        console.log('Admin user found. Updating password to admin123...');
        await prisma.user.update({
            where: { username: 'admin' },
            data: {
                passwordHash: hash,
                isActive: true
            }
        });
        console.log('Admin password updated successfully.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
