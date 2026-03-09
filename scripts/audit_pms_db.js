const { Client } = require('pg');

async function auditPmsDb() {
    const db = 'pms_db';
    const connectionBase = "postgresql://postgres:xuv700@127.0.0.1:5432/";
    console.log(`\n--- Auditing ${db} ---`);
    const client = new Client({ connectionString: connectionBase + db });
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        for (const row of res.rows) {
            const tableName = row.table_name;
            try {
                const countRes = await client.query(`SELECT count(*) FROM "${tableName}"`);
                console.log(`Table: ${tableName} -> Count: ${countRes.rows[0].count}`);
            } catch (e) {
                console.log(`Table: ${tableName} -> (Error counting: ${e.message})`);
            }
        }
    } catch (err) {
        console.error(`Error in ${db}:`, err.message);
    } finally {
        await client.end();
    }
}

auditPmsDb();
