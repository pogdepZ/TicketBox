import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import {
  Permission,
  PrismaClient,
  Role,
  UserStatus,
  ConcertStatus,
  TicketTypeStatus,
} from '../src/generated/prisma';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const permissions = [
  'concert:read',
  'order:create',
  'order:read_own',
  'payment:create',
  'ticket:read_own',
  'user:manage',
  'concert:read_admin',
  'concert:create',
  'concert:update',
  'concert:cancel',
  'ticket_type:manage',
  'order:read_admin',
  'ticket:read_admin',
  'revenue:read',
  'guest_import:manage',
  'artist_bio:manage',
  'checker:manage',
  'checkin:scan',
  'checkin:sync',
  'checkin:snapshot_read',
  'ticket:verify',
] as const;

const roles = ['customer', 'admin', 'checker'] as const;

const deprecatedRoles = ['organizer', 'checkin_staff', 'audience'] as const;

const rolePermissions = {
  customer: [
    'concert:read',
    'order:create',
    'order:read_own',
    'payment:create',
    'ticket:read_own',
  ],
  admin: [
    'user:manage',
    'concert:read_admin',
    'concert:create',
    'concert:update',
    'concert:cancel',
    'ticket_type:manage',
    'order:read_admin',
    'ticket:read_admin',
    'revenue:read',
    'guest_import:manage',
    'artist_bio:manage',
    'checker:manage',
  ],
  checker: [
    'checkin:scan',
    'checkin:sync',
    'checkin:snapshot_read',
    'ticket:verify',
  ],
} satisfies Record<(typeof roles)[number], Array<(typeof permissions)[number]>>;

async function seedPermissions(): Promise<Map<string, Permission>> {
  const createdPermissions = await Promise.all(
    permissions.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code },
      }),
    ),
  );

  return new Map(
    createdPermissions.map((permission) => [permission.code, permission]),
  );
}

async function seedRoles(): Promise<Map<string, Role>> {
  const createdRoles = await Promise.all(
    roles.map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  return new Map(createdRoles.map((role) => [role.name, role]));
}

async function seedRolePermissions(
  roleByName: Map<string, Role>,
  permissionByCode: Map<string, Permission>,
): Promise<void> {
  for (const [roleName, permissionCodes] of Object.entries(rolePermissions)) {
    const role = roleByName.get(roleName);

    if (!role) {
      throw new Error(`Missing role ${roleName}`);
    }

    for (const permissionCode of permissionCodes) {
      const permission = permissionByCode.get(permissionCode);

      if (!permission) {
        throw new Error(`Missing permission ${permissionCode}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

async function cleanupRolesAndPermissions(
  roleByName: Map<string, Role>,
  permissionByCode: Map<string, Permission>,
): Promise<void> {
  for (const [roleName, allowedPermissionCodes] of Object.entries(
    rolePermissions,
  )) {
    const role = roleByName.get(roleName);

    if (!role) {
      throw new Error(`Missing role ${roleName}`);
    }

    const allowedPermissionIds = allowedPermissionCodes.map((permissionCode) => {
      const permission = permissionByCode.get(permissionCode);

      if (!permission) {
        throw new Error(`Missing permission ${permissionCode}`);
      }

      return permission.id;
    });

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: {
          notIn: allowedPermissionIds,
        },
      },
    });
  }

  await prisma.role.deleteMany({
    where: {
      name: {
        in: [...deprecatedRoles],
      },
    },
  });

  await prisma.permission.deleteMany({
    where: {
      code: {
        notIn: [...permissions],
      },
      roles: {
        none: {},
      },
    },
  });
}

async function seedAdminUser(roleByName: Map<string, Role>): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@gmail.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? '123456';
  const fullName = process.env.SEED_ADMIN_FULL_NAME ?? 'System Admin';

  const adminRole = roleByName.get('admin');

  if (!adminRole) {
    throw new Error('Missing admin role');
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  const adminUser =
    existingAdmin ??
    (await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        fullName,
        status: UserStatus.ACTIVE,
      },
    }));

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        password: await bcrypt.hash(password, 10),
        fullName,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(
      `Admin user ${email} already exists. Password and profile were updated/reset.`,
    );
  } else {
    console.log(`Created admin user ${email}.`);
  }

  await upsertUserRole({
    userId: adminUser.id,
    roleId: adminRole.id,
  });
}

async function seedCheckerUser(roleByName: Map<string, Role>): Promise<void> {
  const email = 'staff@ticketbox.vn';
  const password = 'password123';
  const fullName = 'Check-in Staff';

  const checkerRole = roleByName.get('checker');

  if (!checkerRole) {
    throw new Error('Missing checker role');
  }

  const existingStaff = await prisma.user.findUnique({
    where: { email },
  });

  const staffUser =
    existingStaff ??
    (await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        fullName,
        status: UserStatus.ACTIVE,
      },
    }));

  if (existingStaff) {
    await prisma.user.update({
      where: { id: existingStaff.id },
      data: {
        password: await bcrypt.hash(password, 10),
        fullName,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(
      `Checker user ${email} already exists. Password and profile were updated/reset.`,
    );
  } else {
    console.log(`Created checker user ${email}.`);
  }

  await upsertUserRole({
    userId: staffUser.id,
    roleId: checkerRole.id,
  });
}

async function upsertUserRole(params: {
  userId: string;
  roleId: string;
}): Promise<void> {
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: params.userId,
      roleId: params.roleId,
    },
  });

  if (existingUserRole) {
    return;
  }

  await prisma.userRole.create({
    data: {
      userId: params.userId,
      roleId: params.roleId,
    },
  });
}

async function seedConcertsAndTicketTypes(): Promise<void> {
  const concertName = 'TicketBox Live Seeded';
  const expectedConcertId = '202dedd0-18dc-4d48-a652-d0ee8aa1f441';

  let concert = await prisma.concert.findFirst({
    where: { name: concertName },
  });

  if (concert && concert.id !== expectedConcertId) {
    console.log(`Found seeded concert with incorrect ID (${concert.id}). Recreating with expected ID (${expectedConcertId})...`);
    // Delete dependent records first to avoid foreign key violations
    await prisma.guestImportRow.deleteMany({ where: { batch: { concertId: concert.id } } });
    await prisma.guestImportBatch.deleteMany({ where: { concertId: concert.id } });
    await prisma.guestList.deleteMany({ where: { concertId: concert.id } });
    await prisma.checkinEvent.deleteMany({ where: { ticket: { concertId: concert.id } } });
    await prisma.ticket.deleteMany({ where: { concertId: concert.id } });
    await prisma.paymentEvent.deleteMany({ where: { order: { concertId: concert.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { concertId: concert.id } } });
    await prisma.order.deleteMany({ where: { concertId: concert.id } });
    await prisma.reservationItem.deleteMany({ where: { reservation: { concertId: concert.id } } });
    await prisma.reservationSeat.deleteMany({ where: { concertId: concert.id } });
    await prisma.reservation.deleteMany({ where: { concertId: concert.id } });
    await prisma.waitingRoomSession.deleteMany({ where: { concertId: concert.id } });
    await prisma.checkinDevice.deleteMany({ where: { concertId: concert.id } });
    await prisma.artistAsset.deleteMany({ where: { concertId: concert.id } });
    await prisma.userTicketQuota.deleteMany({ where: { ticketType: { concertId: concert.id } } });
    await prisma.ticketType.deleteMany({ where: { concertId: concert.id } });
    await prisma.seatZone.deleteMany({ where: { concertId: concert.id } });
    await prisma.concert.delete({ where: { id: concert.id } });
    concert = null;
  }

  if (concert) {
    console.log(`Cleaning up old test data (orders, tickets, reservations, quotas) for concert: ${concertName}...`);
    await prisma.guestImportRow.deleteMany({ where: { batch: { concertId: concert.id } } });
    await prisma.guestImportBatch.deleteMany({ where: { concertId: concert.id } });
    await prisma.guestList.deleteMany({ where: { concertId: concert.id } });
    await prisma.checkinEvent.deleteMany({ where: { ticket: { concertId: concert.id } } });
    await prisma.ticket.deleteMany({ where: { concertId: concert.id } });
    await prisma.paymentEvent.deleteMany({ where: { order: { concertId: concert.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { concertId: concert.id } } });
    await prisma.order.deleteMany({ where: { concertId: concert.id } });
    await prisma.reservationItem.deleteMany({ where: { reservation: { concertId: concert.id } } });
    await prisma.reservationSeat.deleteMany({ where: { concertId: concert.id } });
    await prisma.reservation.deleteMany({ where: { concertId: concert.id } });
    await prisma.waitingRoomSession.deleteMany({ where: { concertId: concert.id } });
    await prisma.artistAsset.deleteMany({ where: { concertId: concert.id } });
    await prisma.userTicketQuota.deleteMany({ where: { ticketType: { concertId: concert.id } } });
  }

  if (!concert) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 30); // 30 days in future

    concert = await prisma.concert.create({
      data: {
        id: expectedConcertId,
        name: concertName,
        description: 'A sample seeded concert for Postman flow.',
        artistName: 'The Seeded Band',
        venueName: 'TicketBox Arena',
        venueAddress: '123 Nguyen Hue, District 1, Ho Chi Minh City',
        eventDate,
        status: ConcertStatus.PUBLISHED,
        seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
        posterUrl: 'https://example.com/posters/ticketbox-live.png',
      },
    });
    console.log(`Created seeded concert: "${concertName}" with ID: ${concert.id}`);
  } else {
    console.log(`Seeded concert already exists with ID: ${concert.id}`);
  }

  const zonesData = [
    { code: 'svip', name: 'SVIP', color: '#e5484d' },
    { code: 'vip', name: 'VIP', color: '#e0a82e' },
    { code: 'premium', name: 'CAT1', color: '#3d6f8f' },
    { code: 'standard', name: 'CAT2', color: '#123c3a' },
    { code: 'economy', name: 'GA', color: '#64748b' },
  ];

  const zoneMap: Record<string, string> = {};

  for (const zone of zonesData) {
    let existingZone = await prisma.seatZone.findFirst({
      where: {
        concertId: concert.id,
        code: zone.code,
      },
    });

    if (!existingZone) {
      existingZone = await prisma.seatZone.create({
        data: {
          concertId: concert.id,
          code: zone.code,
          name: zone.name,
          color: zone.color,
        },
      });
      console.log(`  Created SeatZone: ${zone.name} (ID: ${existingZone.id})`);
    } else {
      console.log(`  SeatZone ${zone.name} already exists (ID: ${existingZone.id})`);
    }
    zoneMap[zone.name] = existingZone.id;
  }

  const ticketTypesData = [
    { id: 'da8e128c-682d-4fbb-bee4-5f26545cae11', name: 'SVIP', price: '1800000', totalQuantity: 50, maxPerUser: 100 },
    { id: 'f7c6c7ab-f989-40c8-b81b-8338fc30730e', name: 'VIP', price: '1200000', totalQuantity: 100, maxPerUser: 100 },
    { id: '07ad8d58-b7cc-4fbc-9593-9a76067f9070', name: 'CAT1', price: '850000', totalQuantity: 150, maxPerUser: 100 },
    { id: '4787e219-2270-4f98-8d15-1a7581171cb1', name: 'CAT2', price: '600000', totalQuantity: 200, maxPerUser: 100 },
    { id: '0120ec7c-8c06-4159-a3df-e242d3b2be52', name: 'GA', price: '450000', totalQuantity: 300, maxPerUser: 100 },
  ];

  for (const tt of ticketTypesData) {
    const existing = await prisma.ticketType.findUnique({
      where: {
        concertId_name: {
          concertId: concert.id,
          name: tt.name,
        },
      },
    });

    if (!existing) {
      const created = await prisma.ticketType.create({
        data: {
          id: tt.id,
          concertId: concert.id,
          seatZoneId: zoneMap[tt.name] || null,
          name: tt.name,
          price: tt.price,
          totalQuantity: tt.totalQuantity,
          remaining: tt.totalQuantity,
          maxPerUser: tt.maxPerUser,
          status: TicketTypeStatus.ACTIVE,
        },
      });
      console.log(`  Created TicketType: ${tt.name} (ID: ${created.id})`);
    } else {
      // update seatZoneId, remaining and maxPerUser if it exists
      await prisma.ticketType.update({
        where: { id: existing.id },
        data: {
          seatZoneId: existing.seatZoneId || zoneMap[tt.name] || null,
          remaining: tt.totalQuantity,
          maxPerUser: tt.maxPerUser,
        },
      });
      console.log(`  TicketType ${tt.name} already exists (ID: ${existing.id}). Reset remaining/maxPerUser.`);
    }
  }

  const vipTicketType = await prisma.ticketType.findFirst({
    where: {
      concertId: concert.id,
      name: 'VIP',
    },
  });

  console.log('\n==================================================================');
  console.log('POSTMAN ENVIRONMENT VARIABLES FOR ORDERS + PAYMENTS FLOW:');
  console.log(`concertId: ${concert.id}`);
  console.log(`ticketTypeId: ${vipTicketType?.id || 'N/A'}`);
  console.log('==================================================================\n');
}

async function main(): Promise<void> {
  const permissionByCode = await seedPermissions();
  const roleByName = await seedRoles();

  await seedRolePermissions(roleByName, permissionByCode);
  await cleanupRolesAndPermissions(roleByName, permissionByCode);
  await seedAdminUser(roleByName);
  await seedCheckerUser(roleByName);
  await seedConcertsAndTicketTypes();

  console.log('RBAC seed completed.');
}

main()
  .catch((error: unknown) => {
    console.error('RBAC seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
