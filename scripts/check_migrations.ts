import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMigrations() {
    try {
        const migrations: any[] = await prisma.$queryRaw`SELECT migration_name, applied_steps_count, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC`;
        console.log('--- Migration History ---');
        migrations.forEach(m => console.log(`${m.migration_name} - steps: ${m.applied_steps_count} - at: ${m.finished_at}`));
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkMigrations();
