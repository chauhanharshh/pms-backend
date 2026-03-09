const { Client } = require('pg');

async function checkDb() {
    const client = new Client({
        connectionString: "postgresql://postgres:xuv700@127.0.0.1:5432/pms_db"
    });
    try {
        await client.connect();
        const res = await client.query('SELECT count(*) FROM "users"');
        console.log(`User Count in pms_db: ${res.rows[0].count}`);

        const res2 = await client.query('SELECT count(*) FROM "hotels"');
        console.log(`Hotel Count in pms_db: ${res2.rows[0].count}`);

        const res3 = await client.query('SELECT count(*) FROM "invoices"');
        console.log(`Invoice Count in pms_db: ${res3.rows[0].count}`);
    } catch (err) {
        console.error('Error checking pms_db:', err.message);
    } finally {
        await client.end();
    }
}

checkDb();
