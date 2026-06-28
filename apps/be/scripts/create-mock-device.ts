import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const concert = await prisma.concert.findFirst();
  if (!concert) {
    console.log('No concert found!');
    return;
  }

  const staffUser = await prisma.user.findFirst();
  if (!staffUser) {
    console.log('No staff user found!');
    return;
  }

  await prisma.checkinDevice.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      concertId: concert.id,
      staffUserId: staffUser.id,
      deviceCode: 'TEST-DEV-02',
      gateName: 'Test Gate',
      status: 'ACTIVE',
    },
  });

  console.log('Mock device created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
