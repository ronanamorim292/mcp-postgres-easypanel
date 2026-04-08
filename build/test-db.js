import pool from "./db.js";
async function testDatabase() {
    console.log("🚀 Starting database test...");
    try {
        // 1. Create a test table
        console.log("Creating 'mcp_test_table'...");
        await pool.query(`
      CREATE TABLE IF NOT EXISTS mcp_test_table (
        id SERIAL PRIMARY KEY,
        test_name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `);
        // 2. Insert some data
        console.log("Inserting test data...");
        const insertResult = await pool.query("INSERT INTO mcp_test_table (test_name, metadata) VALUES ($1, $2) RETURNING *", ["MCP Test Entry", { status: "success", version: "1.0.0" }]);
        console.log("Inserted:", insertResult.rows[0]);
        // 3. Query the data
        console.log("Querying data...");
        const selectResult = await pool.query("SELECT * FROM mcp_test_table ORDER BY created_at DESC LIMIT 5");
        console.log("Recent entries:");
        selectResult.rows.forEach((row, i) => {
            console.log(`${i + 1}. [${row.created_at}] ${row.test_name} - ${JSON.stringify(row.metadata)}`);
        });
        console.log("\n✅ Database test completed successfully!");
    }
    catch (error) {
        console.error("❌ Database test failed!");
        console.error(error);
    }
    finally {
        await pool.end();
    }
}
testDatabase();
