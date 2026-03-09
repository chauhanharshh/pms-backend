const { Client } = require('pg');

async function listAll() {
    const dbs = ['pms_db', 'pms_database', 'postgres'];
    const connectionBase = "postgresql://postgres:xuv700@127.0.0.1:5432/";

    for (const db of dbs) {
        console.log(`\n--- Tables in ${db} ---`);
        const client = new Client({ connectionString: connectionBase + db });
        try {
            await client.connect();
            const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            res.rows.forEach(r => {
                // Also get count if it's a known table
                console.log(`Table: ${r.table_name}`);
            });
        } catch (err) {
            console.error(`Error in ${db}:`, err.message);
        } finally {
            await client.end();
        }
    }
}

listAll();
