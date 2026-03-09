const { Client } = require('pg');

async function audit() {
    const client = new Client({ connectionString: "postgresql://postgres:xuv700@127.0.0.1:5432/postgres" });
    try {
        await client.connect();
        const res = await client.query("SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')");
        console.log(`Found ${res.rows.length} tables in postgres DB.`);
        for (const row of res.rows) {
            const countRes = await client.query(`SELECT count(*) FROM "${row.schemaname}"."${row.tablename}"`);
            console.log(`${row.schemaname}.${row.tablename} -> Count: ${countRes.rows[0].count}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

audit();
