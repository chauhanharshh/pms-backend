const { Client } = require('pg');
require('dotenv').config({ path: 'h:/4ubilling/pms/backend/.env' });

async function auditDb() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

        const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'hotel_stewards'
    `);
        console.log('Columns in hotel_stewards:', columns.rows);

        const constraints = await client.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'hotel_stewards'::regclass
    `);
        console.log('Constraints on hotel_stewards:', constraints.rows);

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await client.end();
    }
}

auditDb();
