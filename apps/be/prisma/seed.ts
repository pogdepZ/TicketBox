import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ArtistBioStatus,
  AssetStatus,
  CheckinDeviceStatus,
  CheckinMode,
  CheckinResult,
  ConcertStatus,
  GuestImportStatus,
  GuestRowStatus,
  GuestStatus,
  IdempotencyStatus,
  NotificationChannel,
  NotificationStatus,
  OrderStatus,
  PaymentGateway,
  PaymentMethod,
  Prisma,
  PrismaClient,
  ReservationStatus,
  ScopeType,
  TicketStatus,
  TicketTypeStatus,
  UserStatus,
  WaitingRoomStatus,
} from '../src/generated/prisma';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const now = new Date('2026-06-04T00:00:00.000Z');
const eventDate = new Date('2026-12-20T13:00:00.000Z');
const saleStartAt = new Date('2026-06-10T02:00:00.000Z');
const saleEndAt = new Date('2026-12-19T16:59:59.000Z');
const expiresAt = new Date('2026-12-20T15:00:00.000Z');

async function upsertUserRole(params: {
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId?: string | null;
}) {
  const existing = await prisma.userRole.findFirst({
    where: {
      userId: params.userId,
      roleId: params.roleId,
      scopeType: params.scopeType,
      scopeId: params.scopeId ?? null,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.userRole.create({
    data: {
      userId: params.userId,
      roleId: params.roleId,
      scopeType: params.scopeType,
      scopeId: params.scopeId ?? null,
    },
  });
}

async function upsertConcert() {
  const data = {
    name: 'TicketBox Live 2026',
    description:
      'Concert demo seeded for local development: seat zones, ticket sales, guest list, payment, and check-in flows.',
    artistName: 'The Neon Lights',
    artistBio:
      'The Neon Lights is a pop band known for high-energy live performances and electronic arrangements.',
    artistBioStatus: ArtistBioStatus.DONE,
    venueName: 'Saigon Exhibition and Convention Center',
    venueAddress: '799 Nguyen Van Linh, District 7, Ho Chi Minh City',
    eventDate,
    posterUrl: 'https://cdn.ticketbox.local/posters/ticketbox-live-2026.jpg',
    seatMapSvgUrl: 'https://cdn.ticketbox.local/seat-maps/ticketbox-live-2026.svg',
    status: ConcertStatus.PUBLISHED,
  };

  const existing = await prisma.concert.findFirst({
    where: {
      name: data.name,
      venueName: data.venueName,
      eventDate: data.eventDate,
    },
  });

  if (existing) {
    return prisma.concert.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.concert.create({ data });
}

async function main() {
  const permissions = await Promise.all(
    [
      'users.read',
      'users.manage',
      'concerts.read',
      'concerts.manage',
      'tickets.sell',
      'tickets.scan',
      'orders.read',
      'payments.manage',
      'guests.import',
      'audit.read',
    ].map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code },
      }),
    ),
  );

  const [adminRole, organizerRole, staffRole, customerRole] = await Promise.all(
    ['admin', 'organizer', 'checkin_staff', 'customer'].map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));
  const rolePermissions = new Map<string, string[]>([
    [adminRole.id, permissions.map((permission) => permission.code)],
    [organizerRole.id, ['concerts.read', 'concerts.manage', 'orders.read', 'guests.import']],
    [staffRole.id, ['concerts.read', 'tickets.scan']],
    [customerRole.id, ['concerts.read', 'tickets.sell']],
  ]);

  for (const [roleId, codes] of Array.from(rolePermissions.entries())) {
    for (const code of codes) {
      const permission = permissionByCode.get(code);

      if (!permission) {
        throw new Error(`Missing permission ${code}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId: permission.id,
        },
      });
    }
  }

  const [adminUser, organizerUser, staffUser, customerUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@ticketbox.local' },
      update: {
        phone: '0900000001',
        fullName: 'Admin TicketBox',
        status: UserStatus.ACTIVE,
      },
      create: {
        email: 'admin@ticketbox.local',
        phone: '0900000001',
        passwordHash: '$2b$10$seeded.admin.password.hash',
        fullName: 'Admin TicketBox',
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.upsert({
      where: { email: 'organizer@ticketbox.local' },
      update: {
        phone: '0900000002',
        fullName: 'Organizer Demo',
        status: UserStatus.ACTIVE,
      },
      create: {
        email: 'organizer@ticketbox.local',
        phone: '0900000002',
        passwordHash: '$2b$10$seeded.organizer.password.hash',
        fullName: 'Organizer Demo',
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.upsert({
      where: { email: 'staff@ticketbox.local' },
      update: {
        phone: '0900000003',
        fullName: 'Check-in Staff',
        status: UserStatus.ACTIVE,
      },
      create: {
        email: 'staff@ticketbox.local',
        phone: '0900000003',
        passwordHash: '$2b$10$seeded.staff.password.hash',
        fullName: 'Check-in Staff',
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.upsert({
      where: { email: 'customer@ticketbox.local' },
      update: {
        phone: '0900000004',
        fullName: 'Customer Demo',
        status: UserStatus.ACTIVE,
      },
      create: {
        email: 'customer@ticketbox.local',
        phone: '0900000004',
        passwordHash: '$2b$10$seeded.customer.password.hash',
        fullName: 'Customer Demo',
        status: UserStatus.ACTIVE,
      },
    }),
  ]);

  await Promise.all([
    upsertUserRole({ userId: adminUser.id, roleId: adminRole.id, scopeType: ScopeType.GLOBAL }),
    upsertUserRole({
      userId: organizerUser.id,
      roleId: organizerRole.id,
      scopeType: ScopeType.GLOBAL,
    }),
    upsertUserRole({ userId: staffUser.id, roleId: staffRole.id, scopeType: ScopeType.GLOBAL }),
    upsertUserRole({
      userId: customerUser.id,
      roleId: customerRole.id,
      scopeType: ScopeType.GLOBAL,
    }),
  ]);

  const concert = await upsertConcert();

  await prisma.concert.update({
    where: { id: concert.id },
    data: { createdById: organizerUser.id },
  });

  await Promise.all([
    upsertUserRole({
      userId: organizerUser.id,
      roleId: organizerRole.id,
      scopeType: ScopeType.CONCERT,
      scopeId: concert.id,
    }),
    upsertUserRole({
      userId: staffUser.id,
      roleId: staffRole.id,
      scopeType: ScopeType.CONCERT,
      scopeId: concert.id,
    }),
  ]);

  const [vipZone, standardZone, balconyZone] = await Promise.all([
    prisma.seatZone.upsert({
      where: { concertId_code: { concertId: concert.id, code: 'VIP' } },
      update: { name: 'VIP', color: '#D97706', svgElementId: 'zone-vip' },
      create: {
        concertId: concert.id,
        code: 'VIP',
        name: 'VIP',
        color: '#D97706',
        svgElementId: 'zone-vip',
      },
    }),
    prisma.seatZone.upsert({
      where: { concertId_code: { concertId: concert.id, code: 'STD' } },
      update: { name: 'Standard', color: '#2563EB', svgElementId: 'zone-standard' },
      create: {
        concertId: concert.id,
        code: 'STD',
        name: 'Standard',
        color: '#2563EB',
        svgElementId: 'zone-standard',
      },
    }),
    prisma.seatZone.upsert({
      where: { concertId_code: { concertId: concert.id, code: 'BAL' } },
      update: { name: 'Balcony', color: '#16A34A', svgElementId: 'zone-balcony' },
      create: {
        concertId: concert.id,
        code: 'BAL',
        name: 'Balcony',
        color: '#16A34A',
        svgElementId: 'zone-balcony',
      },
    }),
  ]);

  const [vipTicketType, standardTicketType, balconyTicketType] = await Promise.all([
    prisma.ticketType.upsert({
      where: { concertId_name: { concertId: concert.id, name: 'VIP Early Bird' } },
      update: {
        seatZoneId: vipZone.id,
        price: new Prisma.Decimal('2500000.00'),
        totalQuantity: 100,
        remaining: 96,
        maxPerUser: 2,
        saleStartAt,
        saleEndAt,
        status: TicketTypeStatus.ACTIVE,
      },
      create: {
        concertId: concert.id,
        seatZoneId: vipZone.id,
        name: 'VIP Early Bird',
        price: new Prisma.Decimal('2500000.00'),
        totalQuantity: 100,
        remaining: 96,
        maxPerUser: 2,
        saleStartAt,
        saleEndAt,
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.upsert({
      where: { concertId_name: { concertId: concert.id, name: 'Standard' } },
      update: {
        seatZoneId: standardZone.id,
        price: new Prisma.Decimal('900000.00'),
        totalQuantity: 800,
        remaining: 798,
        maxPerUser: 4,
        saleStartAt,
        saleEndAt,
        status: TicketTypeStatus.ACTIVE,
      },
      create: {
        concertId: concert.id,
        seatZoneId: standardZone.id,
        name: 'Standard',
        price: new Prisma.Decimal('900000.00'),
        totalQuantity: 800,
        remaining: 798,
        maxPerUser: 4,
        saleStartAt,
        saleEndAt,
        status: TicketTypeStatus.ACTIVE,
      },
    }),
    prisma.ticketType.upsert({
      where: { concertId_name: { concertId: concert.id, name: 'Balcony' } },
      update: {
        seatZoneId: balconyZone.id,
        price: new Prisma.Decimal('550000.00'),
        totalQuantity: 500,
        remaining: 500,
        maxPerUser: 4,
        saleStartAt,
        saleEndAt,
        status: TicketTypeStatus.ACTIVE,
      },
      create: {
        concertId: concert.id,
        seatZoneId: balconyZone.id,
        name: 'Balcony',
        price: new Prisma.Decimal('550000.00'),
        totalQuantity: 500,
        remaining: 500,
        maxPerUser: 4,
        saleStartAt,
        saleEndAt,
        status: TicketTypeStatus.ACTIVE,
      },
    }),
  ]);

  const reservation =
    (await prisma.reservation.findFirst({
      where: {
        userId: customerUser.id,
        concertId: concert.id,
        status: ReservationStatus.CONFIRMED,
      },
    })) ??
    (await prisma.reservation.create({
      data: {
        userId: customerUser.id,
        concertId: concert.id,
        status: ReservationStatus.CONFIRMED,
        expiresAt,
      },
    }));

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: { expiresAt },
  });

  await Promise.all([
    prisma.reservationItem.upsert({
      where: {
        reservationId_ticketTypeId: {
          reservationId: reservation.id,
          ticketTypeId: vipTicketType.id,
        },
      },
      update: { quantity: 2, unitPrice: new Prisma.Decimal('2500000.00') },
      create: {
        reservationId: reservation.id,
        ticketTypeId: vipTicketType.id,
        quantity: 2,
        unitPrice: new Prisma.Decimal('2500000.00'),
      },
    }),
    prisma.reservationItem.upsert({
      where: {
        reservationId_ticketTypeId: {
          reservationId: reservation.id,
          ticketTypeId: standardTicketType.id,
        },
      },
      update: { quantity: 2, unitPrice: new Prisma.Decimal('900000.00') },
      create: {
        reservationId: reservation.id,
        ticketTypeId: standardTicketType.id,
        quantity: 2,
        unitPrice: new Prisma.Decimal('900000.00'),
      },
    }),
  ]);

  await Promise.all([
    prisma.userTicketQuota.upsert({
      where: {
        userId_ticketTypeId: {
          userId: customerUser.id,
          ticketTypeId: vipTicketType.id,
        },
      },
      update: { heldQuantity: 0, paidQuantity: 2 },
      create: {
        userId: customerUser.id,
        ticketTypeId: vipTicketType.id,
        heldQuantity: 0,
        paidQuantity: 2,
      },
    }),
    prisma.userTicketQuota.upsert({
      where: {
        userId_ticketTypeId: {
          userId: customerUser.id,
          ticketTypeId: standardTicketType.id,
        },
      },
      update: { heldQuantity: 0, paidQuantity: 2 },
      create: {
        userId: customerUser.id,
        ticketTypeId: standardTicketType.id,
        heldQuantity: 0,
        paidQuantity: 2,
      },
    }),
  ]);

  const order = await prisma.order.upsert({
    where: { idempotencyKey: 'seed-order-ticketbox-live-2026' },
    update: {
      userId: customerUser.id,
      concertId: concert.id,
      reservationId: reservation.id,
      status: OrderStatus.PAID,
      totalAmount: new Prisma.Decimal('6800000.00'),
      paymentMethod: PaymentMethod.VNPAY,
      paymentRef: 'VNPAY-SEED-2026-0001',
      paidAt: now,
      expiresAt,
    },
    create: {
      userId: customerUser.id,
      concertId: concert.id,
      reservationId: reservation.id,
      idempotencyKey: 'seed-order-ticketbox-live-2026',
      status: OrderStatus.PAID,
      totalAmount: new Prisma.Decimal('6800000.00'),
      paymentMethod: PaymentMethod.VNPAY,
      paymentRef: 'VNPAY-SEED-2026-0001',
      paidAt: now,
      expiresAt,
    },
  });

  await Promise.all([
    prisma.orderItem.upsert({
      where: {
        orderId_ticketTypeId: {
          orderId: order.id,
          ticketTypeId: vipTicketType.id,
        },
      },
      update: { quantity: 2, unitPrice: new Prisma.Decimal('2500000.00') },
      create: {
        orderId: order.id,
        ticketTypeId: vipTicketType.id,
        quantity: 2,
        unitPrice: new Prisma.Decimal('2500000.00'),
      },
    }),
    prisma.orderItem.upsert({
      where: {
        orderId_ticketTypeId: {
          orderId: order.id,
          ticketTypeId: standardTicketType.id,
        },
      },
      update: { quantity: 2, unitPrice: new Prisma.Decimal('900000.00') },
      create: {
        orderId: order.id,
        ticketTypeId: standardTicketType.id,
        quantity: 2,
        unitPrice: new Prisma.Decimal('900000.00'),
      },
    }),
  ]);

  await prisma.paymentEvent.upsert({
    where: {
      gateway_gatewayTransactionId_eventType: {
        gateway: PaymentGateway.VNPAY,
        gatewayTransactionId: 'VNPAY-SEED-2026-0001',
        eventType: 'PAYMENT_SUCCEEDED',
      },
    },
    update: {
      orderId: order.id,
      rawPayload: { amount: 6800000, currency: 'VND', reference: 'VNPAY-SEED-2026-0001' },
      signatureValid: true,
      processedAt: now,
    },
    create: {
      orderId: order.id,
      gateway: PaymentGateway.VNPAY,
      gatewayTransactionId: 'VNPAY-SEED-2026-0001',
      eventType: 'PAYMENT_SUCCEEDED',
      rawPayload: { amount: 6800000, currency: 'VND', reference: 'VNPAY-SEED-2026-0001' },
      signatureValid: true,
      processedAt: now,
    },
  });

  const [vipTicketOne, vipTicketTwo, standardTicketOne] = await Promise.all([
    prisma.ticket.upsert({
      where: { ticketCode: 'TBX-2026-VIP-0001' },
      update: {
        orderId: order.id,
        ticketTypeId: vipTicketType.id,
        ownerUserId: customerUser.id,
        qrPayload: 'seed.qr.payload.vip.0001',
        seatNumber: 'VIP-A01',
        status: TicketStatus.ACTIVE,
      },
      create: {
        orderId: order.id,
        ticketTypeId: vipTicketType.id,
        ownerUserId: customerUser.id,
        ticketCode: 'TBX-2026-VIP-0001',
        qrPayload: 'seed.qr.payload.vip.0001',
        seatNumber: 'VIP-A01',
        status: TicketStatus.ACTIVE,
      },
    }),
    prisma.ticket.upsert({
      where: { ticketCode: 'TBX-2026-VIP-0002' },
      update: {
        orderId: order.id,
        ticketTypeId: vipTicketType.id,
        ownerUserId: customerUser.id,
        qrPayload: 'seed.qr.payload.vip.0002',
        seatNumber: 'VIP-A02',
        status: TicketStatus.ACTIVE,
      },
      create: {
        orderId: order.id,
        ticketTypeId: vipTicketType.id,
        ownerUserId: customerUser.id,
        ticketCode: 'TBX-2026-VIP-0002',
        qrPayload: 'seed.qr.payload.vip.0002',
        seatNumber: 'VIP-A02',
        status: TicketStatus.ACTIVE,
      },
    }),
    prisma.ticket.upsert({
      where: { ticketCode: 'TBX-2026-STD-0001' },
      update: {
        orderId: order.id,
        ticketTypeId: standardTicketType.id,
        ownerUserId: customerUser.id,
        qrPayload: 'seed.qr.payload.std.0001',
        seatNumber: 'STD-B12',
        status: TicketStatus.USED,
        scannedAt: now,
        scannedById: staffUser.id,
        scannedDevice: 'GATE-A-01',
      },
      create: {
        orderId: order.id,
        ticketTypeId: standardTicketType.id,
        ownerUserId: customerUser.id,
        ticketCode: 'TBX-2026-STD-0001',
        qrPayload: 'seed.qr.payload.std.0001',
        seatNumber: 'STD-B12',
        status: TicketStatus.USED,
        scannedAt: now,
        scannedById: staffUser.id,
        scannedDevice: 'GATE-A-01',
      },
    }),
  ]);

  await prisma.ticket.upsert({
    where: { ticketCode: 'TBX-2026-STD-0002' },
    update: {
      orderId: order.id,
      ticketTypeId: standardTicketType.id,
      ownerUserId: customerUser.id,
      qrPayload: 'seed.qr.payload.std.0002',
      seatNumber: 'STD-B13',
      status: TicketStatus.ACTIVE,
    },
    create: {
      orderId: order.id,
      ticketTypeId: standardTicketType.id,
      ownerUserId: customerUser.id,
      ticketCode: 'TBX-2026-STD-0002',
      qrPayload: 'seed.qr.payload.std.0002',
      seatNumber: 'STD-B13',
      status: TicketStatus.ACTIVE,
    },
  });

  const device = await prisma.checkinDevice.upsert({
    where: { deviceCode: 'GATE-A-01' },
    update: {
      staffUserId: staffUser.id,
      concertId: concert.id,
      gateName: 'Main Gate A',
      status: CheckinDeviceStatus.ACTIVE,
      lastSyncAt: now,
    },
    create: {
      deviceCode: 'GATE-A-01',
      staffUserId: staffUser.id,
      concertId: concert.id,
      gateName: 'Main Gate A',
      status: CheckinDeviceStatus.ACTIVE,
      lastSyncAt: now,
    },
  });

  await prisma.checkinEvent.upsert({
    where: {
      deviceId_clientEventId: {
        deviceId: device.id,
        clientEventId: 'seed-checkin-0001',
      },
    },
    update: {
      ticketId: standardTicketOne.id,
      staffUserId: staffUser.id,
      scannedAtClient: now,
      mode: CheckinMode.ONLINE,
      result: CheckinResult.ACCEPTED,
      reason: null,
    },
    create: {
      ticketId: standardTicketOne.id,
      staffUserId: staffUser.id,
      deviceId: device.id,
      clientEventId: 'seed-checkin-0001',
      scannedAtClient: now,
      mode: CheckinMode.ONLINE,
      result: CheckinResult.ACCEPTED,
      reason: null,
    },
  });

  const batch =
    (await prisma.guestImportBatch.findFirst({
      where: {
        concertId: concert.id,
        fileHash: 'seed-guest-import-ticketbox-live-2026',
      },
    })) ??
    (await prisma.guestImportBatch.create({
      data: {
        concertId: concert.id,
        fileUrl: 'https://cdn.ticketbox.local/imports/guest-list-seed.csv',
        fileHash: 'seed-guest-import-ticketbox-live-2026',
        status: GuestImportStatus.COMPLETED,
        totalRows: 3,
        validRows: 2,
        invalidRows: 1,
        completedAt: now,
      },
    }));

  await prisma.guestImportBatch.update({
    where: { id: batch.id },
    data: {
      fileUrl: 'https://cdn.ticketbox.local/imports/guest-list-seed.csv',
      status: GuestImportStatus.COMPLETED,
      totalRows: 3,
      validRows: 2,
      invalidRows: 1,
      completedAt: now,
    },
  });

  for (const row of [
    {
      rowNumber: 1,
      fullName: 'Press Guest One',
      email: 'press.one@example.com',
      phone: '0911111111',
      guestType: 'PRESS',
      guestCode: 'GUEST-PRESS-001',
      validationStatus: GuestRowStatus.VALID,
      errorMessage: null,
    },
    {
      rowNumber: 2,
      fullName: 'Partner Guest Two',
      email: 'partner.two@example.com',
      phone: '0922222222',
      guestType: 'PARTNER',
      guestCode: 'GUEST-PARTNER-002',
      validationStatus: GuestRowStatus.VALID,
      errorMessage: null,
    },
    {
      rowNumber: 3,
      fullName: null,
      email: 'invalid@example.com',
      phone: null,
      guestType: 'PRESS',
      guestCode: null,
      validationStatus: GuestRowStatus.INVALID,
      errorMessage: 'Missing fullName and guestCode',
    },
  ]) {
    const existingRow = await prisma.guestImportRow.findFirst({
      where: {
        batchId: batch.id,
        rowNumber: row.rowNumber,
      },
    });

    if (existingRow) {
      await prisma.guestImportRow.update({
        where: { id: existingRow.id },
        data: row,
      });
    } else {
      await prisma.guestImportRow.create({
        data: {
          batchId: batch.id,
          ...row,
        },
      });
    }
  }

  await Promise.all([
    prisma.guestList.upsert({
      where: {
        concertId_guestCode: {
          concertId: concert.id,
          guestCode: 'GUEST-PRESS-001',
        },
      },
      update: {
        fullName: 'Press Guest One',
        email: 'press.one@example.com',
        phone: '0911111111',
        guestType: 'PRESS',
        status: GuestStatus.ACTIVE,
        csvBatchId: batch.id,
      },
      create: {
        concertId: concert.id,
        fullName: 'Press Guest One',
        email: 'press.one@example.com',
        phone: '0911111111',
        guestType: 'PRESS',
        guestCode: 'GUEST-PRESS-001',
        status: GuestStatus.ACTIVE,
        csvBatchId: batch.id,
      },
    }),
    prisma.guestList.upsert({
      where: {
        concertId_guestCode: {
          concertId: concert.id,
          guestCode: 'GUEST-PARTNER-002',
        },
      },
      update: {
        fullName: 'Partner Guest Two',
        email: 'partner.two@example.com',
        phone: '0922222222',
        guestType: 'PARTNER',
        status: GuestStatus.CHECKED_IN,
        csvBatchId: batch.id,
        scannedAt: now,
        scannedById: staffUser.id,
      },
      create: {
        concertId: concert.id,
        fullName: 'Partner Guest Two',
        email: 'partner.two@example.com',
        phone: '0922222222',
        guestType: 'PARTNER',
        guestCode: 'GUEST-PARTNER-002',
        status: GuestStatus.CHECKED_IN,
        csvBatchId: batch.id,
        scannedAt: now,
        scannedById: staffUser.id,
      },
    }),
  ]);

  const existingAsset = await prisma.artistAsset.findFirst({
    where: {
      concertId: concert.id,
      fileUrl: 'https://cdn.ticketbox.local/assets/neon-lights-bio.pdf',
    },
  });

  if (existingAsset) {
    await prisma.artistAsset.update({
      where: { id: existingAsset.id },
      data: {
        status: AssetStatus.DONE,
        uploadedById: organizerUser.id,
        extractedText: 'Seeded artist profile and press kit text.',
        generatedBio: 'The Neon Lights bring an immersive electronic pop show to Ho Chi Minh City.',
      },
    });
  } else {
    await prisma.artistAsset.create({
      data: {
        concertId: concert.id,
        fileUrl: 'https://cdn.ticketbox.local/assets/neon-lights-bio.pdf',
        fileType: 'application/pdf',
        originalFileName: 'neon-lights-bio.pdf',
        status: AssetStatus.DONE,
        uploadedById: organizerUser.id,
        extractedText: 'Seeded artist profile and press kit text.',
        generatedBio: 'The Neon Lights bring an immersive electronic pop show to Ho Chi Minh City.',
      },
    });
  }

  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: customerUser.id,
      channel: NotificationChannel.EMAIL,
      template: 'ORDER_PAID',
    },
  });

  if (existingNotification) {
    await prisma.notification.update({
      where: { id: existingNotification.id },
      data: {
        payload: { orderId: order.id, ticketCodes: [vipTicketOne.ticketCode, vipTicketTwo.ticketCode] },
        status: NotificationStatus.SENT,
        retryCount: 0,
        sentAt: now,
        errorMessage: null,
      },
    });
  } else {
    await prisma.notification.create({
      data: {
        userId: customerUser.id,
        channel: NotificationChannel.EMAIL,
        template: 'ORDER_PAID',
        payload: { orderId: order.id, ticketCodes: [vipTicketOne.ticketCode, vipTicketTwo.ticketCode] },
        status: NotificationStatus.SENT,
        retryCount: 0,
        sentAt: now,
      },
    });
  }

  await prisma.idempotencyRecord.upsert({
    where: { key: 'seed-idempotency-order-ticketbox-live-2026' },
    update: {
      userId: customerUser.id,
      requestHash: 'sha256:seed-order-ticketbox-live-2026',
      status: IdempotencyStatus.COMPLETED,
      responseStatus: 201,
      responseBody: { orderId: order.id, status: OrderStatus.PAID },
      expiresAt,
    },
    create: {
      key: 'seed-idempotency-order-ticketbox-live-2026',
      userId: customerUser.id,
      requestHash: 'sha256:seed-order-ticketbox-live-2026',
      status: IdempotencyStatus.COMPLETED,
      responseStatus: 201,
      responseBody: { orderId: order.id, status: OrderStatus.PAID },
      expiresAt,
    },
  });

  await prisma.waitingRoomSession.upsert({
    where: {
      concertId_userId: {
        concertId: concert.id,
        userId: customerUser.id,
      },
    },
    update: {
      token: 'seed-waiting-room-token-ticketbox-live-2026',
      position: 1,
      status: WaitingRoomStatus.ADMITTED,
      admittedAt: now,
      expiresAt,
    },
    create: {
      concertId: concert.id,
      userId: customerUser.id,
      token: 'seed-waiting-room-token-ticketbox-live-2026',
      position: 1,
      status: WaitingRoomStatus.ADMITTED,
      admittedAt: now,
      expiresAt,
    },
  });

  const existingAuditLog = await prisma.auditLog.findFirst({
    where: {
      actorUserId: adminUser.id,
      action: 'seed.database',
      resourceType: 'concert',
      resourceId: concert.id,
    },
  });

  const auditData = {
    actorUserId: adminUser.id,
    action: 'seed.database',
    resourceType: 'concert',
    resourceId: concert.id,
    metadata: {
      source: 'prisma/seed.ts',
      concertName: concert.name,
      seededAt: now.toISOString(),
    },
  };

  if (existingAuditLog) {
    await prisma.auditLog.update({
      where: { id: existingAuditLog.id },
      data: auditData,
    });
  } else {
    await prisma.auditLog.create({ data: auditData });
  }

  console.log('Seed completed');
  console.log({
    users: [adminUser.email, organizerUser.email, staffUser.email, customerUser.email],
    concert: concert.name,
    ticketTypes: [vipTicketType.name, standardTicketType.name, balconyTicketType.name],
    order: order.id,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
