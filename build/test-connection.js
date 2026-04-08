import pool from "./db.js";
async function test() {
    console.log("Testing connection to PostgreSQL...");
    try {
        const res = await pool.query("SELECT NOW() as current_time, version()");
        console.log("Connection successful!");
        console.log("PostgreSQL Time:", res.rows[0].current_time);
        console.log("PostgreSQL Version:", res.rows[0].version);
        console.log("\nListing tables in 'public' schema...");
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LIMIT 5");
        if (tables.rows.length === 0) {
            console.log("No tables found in 'public' schema.");
        }
        else {
            console.log("Found tables:");
            tables.rows.forEach(r => console.log(` - ${r.table_name}`));
        }
    }
    catch (error) {
        console.error("Connection failed!");
        console.error(error);
    }
    finally {
        await pool.end();
    }
}
test();
