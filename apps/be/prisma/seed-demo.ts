import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  try {
    console.log('Clearing existing data...');
    // Clear tables to avoid unique constraint errors
    await prisma.checkinEvent.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.ticketType.deleteMany();
    await prisma.order.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.concert.deleteMany();
    await prisma.user.deleteMany();

    console.log('Seeding Demo Data...');

    const user = await prisma.user.create({
      data: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'staff-001@ticketbox.vn',
        fullName: 'Checker',
      },
    });

    const concert = await prisma.concert.create({
      data: {
        id: 'a35ba9c7-89e4-425c-9d00-8016ac4afc3d',
        name: 'Sơn Tùng M-TP - Sky Tour 2026',
        venueName: 'SVĐ',
        venueAddress: 'HN',
        eventDate: new Date(),
      },
    });

    const reservation = await prisma.reservation.create({
      data: {
        id: '00000000-0000-0000-0000-000000000010',
        userId: user.id,
        concertId: concert.id,
        status: 'CONFIRMED',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        concertId: concert.id,
        reservationId: reservation.id,
        idempotencyKey: '00000000-0000-0000-0000-000000000011',
        totalAmount: 0,
        expiresAt: new Date(Date.now() + 86400000), // expires in 1 day
      },
    });

    const vipType = await prisma.ticketType.create({
      data: {
        concertId: concert.id,
        name: 'VIP',
        price: 0,
        totalQuantity: 100,
        remaining: 100,
      },
    });

    const svipType = await prisma.ticketType.create({
      data: {
        concertId: concert.id,
        name: 'SVIP',
        price: 0,
        totalQuantity: 50,
        remaining: 50,
      },
    });

    console.log('Tạo vé Hợp lệ (ACTIVE)...');
    await prisma.ticket.create({
      data: {
        id: 'f478c73e-0a3e-4629-9997-196085466e0b',
        orderId: order.id,
        ticketTypeId: vipType.id,
        ownerUserId: user.id,
        ticketCode: 'TKB-2026-VIP-001',
        qrPayload: 'TKB-2026-VIP-001',
        status: 'ACTIVE',
      },
    });

    console.log('Tạo vé Đã Check-in (USED)...');
    await prisma.ticket.create({
      data: {
        id: 'c89084d1-a3cb-4e4a-8fb7-085705f22ea8', // Using the ID from user's log
        orderId: order.id,
        ticketTypeId: svipType.id,
        ownerUserId: user.id,
        ticketCode: 'TKB-2026-SVIP-002',
        qrPayload: 'TKB-2026-SVIP-002',
        status: 'USED',
      },
    });

    console.log('Seed xong thành công! ✅');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
