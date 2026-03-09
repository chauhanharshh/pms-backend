const { Client } = require('pg');

async function audit() {
    const client = new Client({ connectionString: "postgresql://postgres:xuv700@127.0.0.1:5432/pms_database" });
    try {
        await client.connect();
        const res = await client.query("SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log(`Found ${res.rows.length} tables in pms_database DB.`);
        const tables = res.rows.map(r => r.tablename).sort();
        console.log(JSON.stringify(tables, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

audit();
