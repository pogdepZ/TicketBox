import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const c1 = await prisma.concert.findFirst();
  if (!c1) return;
  await prisma.guestList.create({
    data: {
      concertId: c1.id,
      guestCode: 'VIP-GUEST-001',
      fullName: 'Nguyen Van A VIP',
      status: 'ACTIVE',
      allowedGates: ['Gate VVIP'],
      email: 'vip@example.com'
    }
  });
  console.log('Guest added');
}

main().catch(console.error).finally(() => prisma.$disconnect());
