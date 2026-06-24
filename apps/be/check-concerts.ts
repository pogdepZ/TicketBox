import { PrismaClient } from './src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString: url });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const concerts = await prisma.concert.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      eventDate: true
    }
  });
  console.log("\n=================================");
  console.log("LIST OF CONCERTS IN DATABASE:");
  console.log("=================================");
  concerts.forEach(c => {
    console.log(`- ID: ${c.id}`);
    console.log(`  Name: ${c.name}`);
    console.log(`  Status: ${c.status}`);
    console.log(`  Date: ${c.eventDate}`);
    console.log("---------------------------------");
  });
  console.log("=================================\n");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
