const { Client } = require('pg');

async function listDbs() {
    const client = new Client({
        connectionString: "postgresql://postgres:xuv700@127.0.0.1:5432/postgres" // Connect to default postgres DB
    });
    try {
        await client.connect();
        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
        console.log('--- All Databases ---');
        res.rows.forEach(row => console.log(row.datname));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

listDbs();
