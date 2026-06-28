import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ConcertStatus, TicketTypeStatus, UserStatus, TicketStatus, OrderStatus } from '../src/generated/prisma';
import * as jwt from 'jsonwebtoken';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log('🌱 Starting seed...');
  const privBase64 = process.env.JWT_TICKET_PRIVATE_KEY;
  if (!privBase64) throw new Error('JWT_TICKET_PRIVATE_KEY is not defined');
  const privateKey = Buffer.from(privBase64, 'base64').toString('utf8');

  // 1. Create a User (Admin/Creator)
  const user = await prisma.user.upsert({
    where: { email: 'admin@ticketbox.vn' },
    update: {},
    create: {
      email: 'admin@ticketbox.vn',
      fullName: 'System Admin',
      status: UserStatus.ACTIVE,
    },
  });

  // 2. Create Concerts
  const concert1 = await prisma.concert.create({
    data: {
      name: 'Anh Trai Vượt Ngàn Chông Gai 2026',
      venueName: 'Sân Vận Động Phú Thọ',
      venueAddress: 'Q11, TP.HCM',
      eventDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: ConcertStatus.PUBLISHED,
      createdById: user.id,
      posterUrl: 'https://example.com/poster1.jpg',
    },
  });

  const concert2 = await prisma.concert.create({
    data: {
      name: 'BlackPink World Tour - HCM',
      venueName: 'Sân Vận Động Mỹ Đình',
      venueAddress: 'Nam Từ Liêm, Hà Nội',
      eventDate: new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: ConcertStatus.PUBLISHED,
      createdById: user.id,
      posterUrl: 'https://example.com/poster2.jpg',
    },
  });

  // Create Mock Reservations and Orders for Concert 1
  const reservation1 = await prisma.reservation.create({
    data: {
      userId: user.id,
      concertId: concert1.id,
      status: 'CONFIRMED',
      expiresAt: new Date(new Date().getTime() + 30 * 60 * 1000),
    }
  });

  const order1 = await prisma.order.create({
    data: {
      userId: user.id,
      concertId: concert1.id,
      reservationId: reservation1.id,
      idempotencyKey: 'seed-order-1',
      status: OrderStatus.PAID,
      totalAmount: 13000000,
      expiresAt: new Date(new Date().getTime() + 30 * 60 * 1000),
    }
  });

  // 3. Create TicketTypes for Concert 1
  const c1_VVIP = await prisma.ticketType.create({
    data: {
      concertId: concert1.id,
      name: 'VVIP',
      price: 5000000,
      totalQuantity: 100,
      remaining: 80,
      maxPerUser: 4,
      status: TicketTypeStatus.ACTIVE,
      allowedGates: ['Gate A', 'Gate VVIP'],
    },
  });

  const c1_GA = await prisma.ticketType.create({
    data: {
      concertId: concert1.id,
      name: 'GA',
      price: 1500000,
      totalQuantity: 1000,
      remaining: 900,
      maxPerUser: 10,
      status: TicketTypeStatus.ACTIVE,
      allowedGates: ['Gate B', 'Gate C'],
    },
  });

  // Create Tickets for Concert 1
  for (let i = 0; i < 5; i++) {
    await prisma.ticket.create({
      data: {
        orderId: order1.id,
        concertId: concert1.id,
        ticketTypeId: c1_VVIP.id,
        ownerUserId: user.id,
        ticketCode: `C1-VVIP-00${i+1}`,
        qrPayload: jwt.sign({ ticket_code: `C1-VVIP-00${i+1}` }, privateKey, { algorithm: 'RS256' }),
        status: TicketStatus.ACTIVE,
        seatNumber: `A-${i+1}`,
      },
    });
    
    await prisma.ticket.create({
      data: {
        orderId: order1.id,
        concertId: concert1.id,
        ticketTypeId: c1_GA.id,
        ownerUserId: user.id,
        ticketCode: `C1-GA-00${i+1}`,
        qrPayload: jwt.sign({ ticket_code: `C1-GA-00${i+1}` }, privateKey, { algorithm: 'RS256' }),
        status: TicketStatus.ACTIVE,
      },
    });
  }

  // Create Mock Reservations and Orders for Concert 2
  const reservation2 = await prisma.reservation.create({
    data: {
      userId: user.id,
      concertId: concert2.id,
      status: 'CONFIRMED',
      expiresAt: new Date(new Date().getTime() + 30 * 60 * 1000),
    }
  });

  const order2 = await prisma.order.create({
    data: {
      userId: user.id,
      concertId: concert2.id,
      reservationId: reservation2.id,
      idempotencyKey: 'seed-order-2',
      status: OrderStatus.PAID,
      totalAmount: 15000000,
      expiresAt: new Date(new Date().getTime() + 30 * 60 * 1000),
    }
  });

  // 4. Create TicketTypes for Concert 2
  const c2_VIP = await prisma.ticketType.create({
    data: {
      concertId: concert2.id,
      name: 'VIP',
      price: 9000000,
      totalQuantity: 500,
      remaining: 400,
      maxPerUser: 2,
      status: TicketTypeStatus.ACTIVE,
      allowedGates: ['Gate 1'],
    },
  });

  const c2_CAT1 = await prisma.ticketType.create({
    data: {
      concertId: concert2.id,
      name: 'CAT 1',
      price: 6000000,
      totalQuantity: 2000,
      remaining: 1500,
      maxPerUser: 4,
      status: TicketTypeStatus.ACTIVE,
      allowedGates: ['Gate 2', 'Gate 3'],
    },
  });

  // Create Tickets for Concert 2
  for (let i = 0; i < 5; i++) {
    await prisma.ticket.create({
      data: {
        orderId: order2.id,
        concertId: concert2.id,
        ticketTypeId: c2_VIP.id,
        ownerUserId: user.id,
        ticketCode: `C2-VIP-00${i+1}`,
        qrPayload: jwt.sign({ ticket_code: `C2-VIP-00${i+1}` }, privateKey, { algorithm: 'RS256' }),
        status: TicketStatus.ACTIVE,
        seatNumber: `V-${i+1}`,
      },
    });
    
    await prisma.ticket.create({
      data: {
        orderId: order2.id,
        concertId: concert2.id,
        ticketTypeId: c2_CAT1.id,
        ownerUserId: user.id,
        ticketCode: `C2-CAT1-00${i+1}`,
        qrPayload: jwt.sign({ ticket_code: `C2-CAT1-00${i+1}` }, privateKey, { algorithm: 'RS256' }),
        status: TicketStatus.ACTIVE,
      },
    });
  }

  console.log(`✅ Seeded Concert 1: ${concert1.name} with ID: ${concert1.id}`);
  console.log(`✅ Seeded Concert 2: ${concert2.name} with ID: ${concert2.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
