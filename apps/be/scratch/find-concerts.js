const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:postgres@localhost:5432/nest_prisma_db"
});

async function run() {
  await client.connect();
  
  const res = await client.query(`
    SELECT id, title, message, read, created_at, user_id
    FROM in_app_notifications
    WHERE created_at > '2026-06-28 11:35:00'
  `);
  console.log("In-app notifications after 11:35:", res.rows);
  
  await client.end();
}

run().catch(console.error);
