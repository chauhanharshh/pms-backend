const { Client } = require('pg');
const fs = require('fs');

async function listAllSchemas() {
    const db = 'pms_db';
    const connectionBase = "postgresql://postgres:xuv700@127.0.0.1:5432/";
    let output = `--- Enumerating everything in ${db} ---\n`;
    const client = new Client({ connectionString: connectionBase + db });
    try {
        await client.connect();
        const res = await client.query("SELECT schema_name FROM information_schema.schemata");
        output += 'Schemas: ' + res.rows.map(r => r.schema_name).join(', ') + '\n';

        const res2 = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')");
        output += '\nTables across all schemas:\n';
        for (const row of res2.rows) {
            try {
                const countRes = await client.query(`SELECT count(*) FROM "${row.table_schema}"."${row.table_name}"`);
                output += `${row.table_schema}.${row.table_name} -> Count: ${countRes.rows[0].count}\n`;
            } catch (e) {
                output += `${row.table_schema}.${row.table_name} -> (Error: ${e.message})\n`;
            }
        }
    } catch (err) {
        output += `Error in ${db}: ${err.message}\n`;
    } finally {
        await client.end();
        fs.writeFileSync('db_enumeration.txt', output);
        console.log('Results written to db_enumeration.txt');
    }
}

listAllSchemas();
