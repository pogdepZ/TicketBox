import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma';
import { randomUUID } from 'crypto';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log('Seeding demo data for Mobile App...');

  const user = await prisma.user.upsert({
    where: { email: 'staff-001@ticketbox.vn' },
    update: {},
    create: { email: 'staff-001@ticketbox.vn', fullName: 'Checker' },
  });

  const concert = await prisma.concert.create({
    data: {
      name: 'Sơn Tùng M-TP - Sky Tour 2026',
      venueName: 'SVĐ',
      venueAddress: 'HN',
      eventDate: new Date(),
    },
  });

  const reservation = await prisma.reservation.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      status: 'CONFIRMED',
      expiresAt: new Date(Date.now() + 100000),
    },
  });

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      concertId: concert.id,
      reservationId: reservation.id,
      idempotencyKey: randomUUID(),
      totalAmount: 0,
      expiresAt: new Date(Date.now() + 100000),
    },
  });

  const type = await prisma.ticketType.create({
    data: {
      concertId: concert.id,
      name: 'VIP',
      price: 0,
      totalQuantity: 100,
      remaining: 100,
    },
  });

  await prisma.ticket.create({
    data: {
      orderId: order.id,
      ticketTypeId: type.id,
      ownerUserId: user.id,
      concertId: concert.id,
      ticketCode: 'TKB-2026-VIP-001',
      qrPayload: 'TKB-2026-VIP-001',
      status: 'ACTIVE',
    },
  });

  await prisma.ticket.create({
    data: {
      orderId: order.id,
      ticketTypeId: type.id,
      ownerUserId: user.id,
      concertId: concert.id,
      ticketCode: 'TKB-2026-SVIP-002',
      qrPayload: 'TKB-2026-SVIP-002',
      status: 'USED',
    },
  });

  console.log('Demo data seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
