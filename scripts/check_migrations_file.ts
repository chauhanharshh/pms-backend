import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function checkMigrations() {
    try {
        const migrations: any[] = await prisma.$queryRaw`SELECT migration_name, applied_steps_count, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC`;
        let output = '--- Migration History ---\n';
        migrations.forEach(m => {
            output += `${m.migration_name} - steps: ${m.applied_steps_count} - at: ${m.finished_at}\n`;
        });
        fs.writeFileSync('migration_audit.txt', output);
        console.log('Results written to migration_audit.txt');
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkMigrations();
