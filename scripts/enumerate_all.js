const { Client } = require('pg');

async function listAllSchemas() {
    const db = 'pms_database';
    const connectionBase = "postgresql://postgres:xuv700@127.0.0.1:5432/";
    console.log(`\n--- Enumerating everything in ${db} ---`);
    const client = new Client({ connectionString: connectionBase + db });
    try {
        await client.connect();
        const res = await client.query("SELECT schema_name FROM information_schema.schemata");
        console.log('Schemas:', res.rows.map(r => r.schema_name).join(', '));

        const res2 = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')");
        console.log('\nTables across all schemas:');
        for (const row of res2.rows) {
            try {
                const countRes = await client.query(`SELECT count(*) FROM "${row.table_schema}"."${row.table_name}"`);
                console.log(`${row.table_schema}.${row.table_name} -> Count: ${countRes.rows[0].count}`);
            } catch (e) {
                console.log(`${row.table_schema}.${row.table_name} -> (Error: ${e.message})`);
            }
        }
    } catch (err) {
        console.error(`Error in ${db}:`, err.message);
    } finally {
        await client.end();
    }
}

listAllSchemas();
