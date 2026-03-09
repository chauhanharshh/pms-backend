const { Client } = require('pg');

async function audit() {
    const connectionBase = "postgresql://postgres:xuv700@127.0.0.1:5432/";

    // Get all DBs first
    const masterClient = new Client({ connectionString: connectionBase + 'postgres' });
    await masterClient.connect();
    const dbsRes = await masterClient.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    const dbs = dbsRes.rows.map(r => r.datname);
    await masterClient.end();

    for (const db of dbs) {
        console.log(`\n--- Auditing DB: ${db} ---`);
        const client = new Client({ connectionString: connectionBase + db });
        try {
            await client.connect();
            const schemasRes = await client.query("SELECT schema_name FROM information_schema.schemata");
            const schemas = schemasRes.rows.map(r => r.schema_name);
            console.log(`Schemas in ${db}: ${schemas.join(', ')}`);

            for (const schema of schemas) {
                const tablesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}'`);
                for (const row of tablesRes.rows) {
                    const table = row.table_name;
                    try {
                        const countRes = await client.query(`SELECT count(*) FROM "${schema}"."${table}"`);
                        const count = countRes.rows[0].count;
                        console.log(`${db}.${schema}.${table} -> Count: ${count}`);
                    } catch (e) {
                        console.log(`${db}.${schema}.${table} -> (Error: ${e.message})`);
                    }
                }
            }
        } catch (err) {
            console.error(`Error in ${db}:`, err.message);
        } finally {
            await client.end();
        }
    }
}

audit();
