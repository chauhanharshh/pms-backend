const { Client } = require('pg');

async function audit() {
    const client = new Client({ connectionString: "postgresql://postgres:xuv700@127.0.0.1:5432/pms_database" });
    try {
        await client.connect();
        const hotelRes = await client.query("SELECT id, name FROM hotels");
        console.log(`Found ${hotelRes.rows.length} hotels.`);
        console.log(JSON.stringify(hotelRes.rows, null, 2));

        const stewardRes = await client.query("SELECT count(*) FROM hotel_stewards");
        console.log(`Steward count: ${stewardRes.rows[0].count}`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

audit();
