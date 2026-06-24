import { PrismaClient, ConcertStatus } from './src/generated/prisma';
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
  // Update the status of 'Live Test' back to PUBLISHED
  const concertId = '7c837aa3-437d-4fcc-8a20-15247ddd72d9';
  const targetStatus = ConcertStatus.PUBLISHED;
  
  const updated = await prisma.concert.update({
    where: { id: concertId },
    data: { status: targetStatus },
  });
  
  console.log("\n=================================");
  console.log("DATABASE UPDATE TO PUBLISHED PERFORMED:");
  console.log("=================================");
  console.log(`Concert ID: ${updated.id}`);
  console.log(`Name: ${updated.name}`);
  console.log(`New Status: ${updated.status}`);
  console.log("=================================\n");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
