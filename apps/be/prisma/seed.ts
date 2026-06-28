import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'minioadmin',
  },
  endpoint: process.env.AWS_S3_ENDPOINT ?? 'http://localhost:9000',
  forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
});
const s3Bucket = process.env.AWS_S3_BUCKET ?? 'ticketbox-media';
const s3Endpoint = process.env.AWS_S3_ENDPOINT ?? 'http://localhost:9000';

async function uploadPoster(s3Key: string, relativePath: string): Promise<string> {
  const localPath = path.resolve(__dirname, relativePath);
  if (!fs.existsSync(localPath)) {
    console.log(`Poster file not found at ${localPath}, skipping upload.`);
    return '';
  }

  const fileBuffer = fs.readFileSync(localPath);
  console.log(`Uploading local poster ${localPath} to MinIO bucket "${s3Bucket}" with key "${s3Key}"...`);

  const ext = path.extname(localPath).toLowerCase();
  let contentType = 'image/jpeg';
  if (ext === '.png') {
    contentType = 'image/png';
  } else if (ext === '.webp') {
    contentType = 'image/webp';
  } else if (ext === '.gif') {
    contentType = 'image/gif';
  }

  try {
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    const endpoint = s3Endpoint.replace(/\/$/, '');
    return `${endpoint}/${s3Bucket}/${s3Key}`;
  } catch (error) {
    console.error(`Failed to upload poster to S3/MinIO:`, error);
    return '';
  }
}

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

interface ZoneSeedData {
  code: string;
  name: string;
  color: string;
  svgElementId?: string;
}

interface TicketTypeSeedData {
  id: string;
  name: string;
  price: string;
  totalQuantity: number;
  maxPerUser: number;
}

interface ConcertSeedData {
  id: string;
  name: string;
  description: string;
  artistName: string;
  venueName: string;
  venueAddress: string;
  eventDate: Date;
  status: ConcertStatus;
  type?: string;
  city?: string;
  seatMapSvgUrl: string;
  seatMapSvgLocalPath?: string;
  posterLocalPath: string;
  s3Key: string;
  defaultPosterUrl: string;
  zones: ZoneSeedData[];
  ticketTypes: TicketTypeSeedData[];
}

async function uploadSeatMapSvg(concertId: string, relativePath: string): Promise<string> {
  const localPath = path.resolve(__dirname, relativePath);
  if (!fs.existsSync(localPath)) {
    console.log(`Seatmap SVG file not found at ${localPath}, skipping upload.`);
    return '';
  }

  const fileBuffer = fs.readFileSync(localPath);
  console.log(`Uploading local seatmap SVG ${localPath} to MinIO bucket "${s3Bucket}"...`);

  const s3Key = `concerts/${concertId}/seat-maps/map.svg`;

  try {
    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'image/svg+xml',
    });

    await s3Client.send(command);

    const endpoint = s3Endpoint.replace(/\/$/, '');
    return `${endpoint}/${s3Bucket}/${s3Key}`;
  } catch (error) {
    console.error(`Failed to upload seatmap SVG to S3/MinIO:`, error);
    return '';
  }
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedConcert(data: ConcertSeedData): Promise<void> {
  const posterUrl = (await uploadPoster(data.s3Key, data.posterLocalPath)) || data.defaultPosterUrl;

  let seatMapSvgUrl = data.seatMapSvgUrl;
  if (data.seatMapSvgLocalPath) {
    const uploadedSvgUrl = await uploadSeatMapSvg(data.id, data.seatMapSvgLocalPath);
    if (uploadedSvgUrl) {
      seatMapSvgUrl = uploadedSvgUrl;
    }
  }

  let concert = await prisma.concert.findUnique({
    where: { id: data.id },
  });

  const slug = slugify(data.name);

  if (concert) {
    console.log(`Cleaning up old test data for concert: ${data.name} (${data.id})...`);
    await prisma.guestImportRow.deleteMany({ where: { batch: { concertId: data.id } } });
    await prisma.guestImportBatch.deleteMany({ where: { concertId: data.id } });
    await prisma.guestList.deleteMany({ where: { concertId: data.id } });
    await prisma.checkinEvent.deleteMany({ where: { ticket: { concertId: data.id } } });
    await prisma.ticket.deleteMany({ where: { concertId: data.id } });
    await prisma.paymentEvent.deleteMany({ where: { order: { concertId: data.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { concertId: data.id } } });
    await prisma.order.deleteMany({ where: { concertId: data.id } });
    await prisma.reservationItem.deleteMany({ where: { reservation: { concertId: data.id } } });
    await prisma.reservationSeat.deleteMany({ where: { concertId: data.id } });
    await prisma.reservation.deleteMany({ where: { concertId: data.id } });
    await prisma.waitingRoomSession.deleteMany({ where: { concertId: data.id } });
    await prisma.artistAsset.deleteMany({ where: { concertId: data.id } });
    await prisma.userTicketQuota.deleteMany({ where: { ticketType: { concertId: data.id } } });

    concert = await prisma.concert.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug,
        description: data.description,
        artistName: data.artistName,
        venueName: data.venueName,
        venueAddress: data.venueAddress,
        eventDate: data.eventDate,
        status: data.status,
        type: data.type || null,
        city: data.city || null,
        posterUrl,
        seatMapSvgUrl,
      },
    });
  } else {
    concert = await prisma.concert.create({
      data: {
        id: data.id,
        name: data.name,
        slug,
        description: data.description,
        artistName: data.artistName,
        venueName: data.venueName,
        venueAddress: data.venueAddress,
        eventDate: data.eventDate,
        status: data.status,
        type: data.type || null,
        city: data.city || null,
        seatMapSvgUrl,
        posterUrl,
      },
    });
    console.log(`Created seeded concert: "${data.name}"`);
  }

  const zoneMap: Record<string, string> = {};

  for (const zone of data.zones) {
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
          svgElementId: zone.svgElementId || null,
        },
      });
      console.log(`  Created SeatZone: ${zone.name} (ID: ${existingZone.id})`);
    } else {
      existingZone = await prisma.seatZone.update({
        where: { id: existingZone.id },
        data: {
          code: zone.code,
          name: zone.name,
          color: zone.color,
          svgElementId: zone.svgElementId || null,
        },
      });
      console.log(`  SeatZone ${zone.name} updated/synced (ID: ${existingZone.id})`);
    }
    zoneMap[zone.name] = existingZone.id;
  }

  for (const tt of data.ticketTypes) {
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
      await prisma.ticketType.update({
        where: { id: existing.id },
        data: {
          seatZoneId: existing.seatZoneId || zoneMap[tt.name] || null,
          totalQuantity: tt.totalQuantity,
          remaining: tt.totalQuantity,
          maxPerUser: tt.maxPerUser,
        },
      });
      console.log(`  TicketType ${tt.name} already exists (ID: ${existing.id}). Reset remaining/maxPerUser.`);
    }
  }
}

async function seedConcertsAndTicketTypes(): Promise<void> {
  // 1. Wipe all old database event-related data to ensure clean state
  console.log('Wiping all existing concerts, ticket types, and dependent records...');
  await prisma.guestImportRow.deleteMany({});
  await prisma.guestImportBatch.deleteMany({});
  await prisma.guestList.deleteMany({});
  await prisma.checkinEvent.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.paymentEvent.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.reservationItem.deleteMany({});
  await prisma.reservationSeat.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.waitingRoomSession.deleteMany({});
  await prisma.checkinDevice.deleteMany({});
  await prisma.artistAsset.deleteMany({});
  await prisma.userTicketQuota.deleteMany({});
  await prisma.ticketType.deleteMany({});
  await prisma.seatZone.deleteMany({});
  await prisma.concert.deleteMany({});

  // 2. Define Stable Test Concert (TicketBox Live Seeded) - Required for Postman flows
  const ticketBoxLiveConcert: ConcertSeedData = {
    id: '202dedd0-18dc-4d48-a652-d0ee8aa1f441',
    name: 'TicketBox Live Seeded',
    description: 'A stable seeded concert for Postman and automation testing.',
    artistName: 'The Seeded Band',
    venueName: 'TicketBox Arena',
    venueAddress: '123 Nguyen Hue, District 1, Ho Chi Minh City',
    eventDate: new Date(new Date().setDate(new Date().getDate() + 30)),
    status: ConcertStatus.PUBLISHED,
    type: 'Live Music',
    city: 'Thành phố Hồ Chí Minh',
    seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
    seatMapSvgLocalPath: '../fixtures/seatmap_template (2).svg',
    posterLocalPath: '../fixtures/ticketbox_live.jpg',
    s3Key: 'posters/ticketbox_live.jpg',
    defaultPosterUrl: 'https://example.com/posters/ticketbox-live.png',
    zones: [
      { code: 'svip', name: 'SVIP', color: '#e5484d', svgElementId: 'zone-svip' },
      { code: 'vip', name: 'VIP', color: '#e0a82e', svgElementId: 'zone-vip' },
      { code: 'cat1', name: 'CAT1', color: '#3d6f8f', svgElementId: 'zone-cat1' },
      { code: 'cat2', name: 'CAT2', color: '#123c3a', svgElementId: 'zone-cat2' },
      { code: 'ga', name: 'GA', color: '#64748b', svgElementId: 'zone-ga' },
    ],
    ticketTypes: [
      { id: 'da8e128c-682d-4fbb-bee4-5f26545cae11', name: 'SVIP', price: '2000000', totalQuantity: 50, maxPerUser: 100 },
      { id: 'f7c6c7ab-f989-40c8-b81b-8338fc30730e', name: 'VIP', price: '1500000', totalQuantity: 50, maxPerUser: 100 },
      { id: '07ad8d58-b7cc-4fbc-9593-9a76067f9070', name: 'CAT1', price: '1000000', totalQuantity: 50, maxPerUser: 100 },
      { id: '4787e219-2270-4f98-8d15-1a7581171cb1', name: 'CAT2', price: '700000', totalQuantity: 50, maxPerUser: 100 },
      { id: '0120ec7c-8c06-4159-a3df-e242d3b2be52', name: 'GA', price: '400000', totalQuantity: 50, maxPerUser: 100 },
    ],
  };

  await seedConcert(ticketBoxLiveConcert);

  // 3. Define and seed real concerts corresponding to local WebP fixtures
  // NOTE: All IDs are proper UUID v4 (group3 starts with 4, group4 starts with 8/9/a/b)
  // to pass Zod z.string().uuid() validation in API routes.
  const webpConcerts: ConcertSeedData[] = [
    {
      id: 'd8004a06-f8eb-4b82-b146-182f6fd3e9ab',
      name: 'Hanwha Life Esports - Global Fanfest in Vietnam',
      description: 'Đại nhạc hội và ngày hội giao lưu người hâm mộ Hanwha Life Esports Global Fanfest tại Việt Nam.',
      artistName: 'Hanwha Life Esports',
      venueName: 'Nhà thi đấu Phú Thọ',
      venueAddress: '1 Lữ Gia, Phường 15, Quận 11, TP. Hồ Chí Minh',
      eventDate: new Date('2026-08-28T18:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Gaming',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/2805_hanwha-life-esports-global-fanfest-in-vietnam-thumbnail-1600x900_1.webp',
      s3Key: 'posters/hanwha_life_esports_fanfest.webp',
      defaultPosterUrl: 'https://example.com/posters/hanwha.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'cc917d37-1e31-4144-8f4d-d5fc3868ae5e',
      name: 'Lim Yoona Fan Meeting in HCMC',
      description: 'Buổi gặp gỡ người hâm mộ chính thức của nữ ca sĩ, diễn viên Lim Yoona (Girls Generation) tại TP. Hồ Chí Minh.',
      artistName: 'Lim Yoona',
      venueName: 'Nhà hát Hòa Bình',
      venueAddress: '240 Đường 3 Tháng 2, Quận 10, TP. Hồ Chí Minh',
      eventDate: new Date('2026-08-29T19:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Fan Meeting',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/2. 0829_THUMBNAIL_YOONA FM IN HCMC.webp',
      s3Key: 'posters/yoona_fan_meeting.webp',
      defaultPosterUrl: 'https://example.com/posters/yoona.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'f78cdb52-920a-4e65-a6a6-4d1249e85798',
      name: 'Vỹ Dạ Waterfest 2026',
      description: 'Lễ hội âm nhạc nước hoành tráng Vỹ Dạ Waterfest quy tụ dàn nghệ sĩ hàng đầu Việt Nam.',
      artistName: 'Various Artists',
      venueName: 'Sân vận động Quân khu 7',
      venueAddress: '202 Hoàng Văn Thụ, Phường 9, Phú Nhuận, TP. Hồ Chí Minh',
      eventDate: new Date('2027-06-02T16:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Music Festival',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/0206_vy-da-waterfest-2026-thumbnail-1600x900.webp',
      s3Key: 'posters/vy_da_waterfest.webp',
      defaultPosterUrl: 'https://example.com/posters/vy_da.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'c7f72df0-c3d5-4299-b005-87cdda37afa0',
      name: 'Rhyder - Album Live Concert',
      description: 'Live concert ra mắt album phòng thu đặc biệt của quán quân Rhyder.',
      artistName: 'Rhyder',
      venueName: 'Lan Anh Stage',
      venueAddress: '291 Cách Mạng Tháng Tám, Phường 12, Quận 10, TP. Hồ Chí Minh',
      eventDate: new Date('2026-09-15T20:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Live Music',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/thumbnail_rhyder.webp',
      s3Key: 'posters/rhyder_live.webp',
      defaultPosterUrl: 'https://example.com/posters/rhyder.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: '8bd15adf-5483-4be6-a653-8d9f07c2711d',
      name: 'GAM Esports Fan Meeting',
      description: 'Buổi gặp gỡ, giao lưu chính thức của đội tuyển LMHT hàng đầu Việt Nam GAM Esports cùng người hâm mộ.',
      artistName: 'GAM Esports',
      venueName: 'Nhà thi đấu Nguyễn Du',
      venueAddress: '116 Nguyễn Du, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      eventDate: new Date('2026-09-20T14:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Gaming',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/1600x900_GAM.webp',
      s3Key: 'posters/gam_esports_meeting.webp',
      defaultPosterUrl: 'https://example.com/posters/gam.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: '2520d45b-f52e-40c1-9ba7-fcfae6524cc5',
      name: 'Pink Run 2026',
      description: 'Giải chạy marathon từ thiện nâng cao nhận thức cộng đồng Pink Run 2026.',
      artistName: 'Pink Run',
      venueName: 'Saigon Outcast',
      venueAddress: '188/1 Nguyễn Văn Hưởng, Thảo Điền, Quận 2, TP. Hồ Chí Minh',
      eventDate: new Date('2026-10-18T06:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Sport',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/KV pinkrun -1600 x 900.webp',
      s3Key: 'posters/pinkrun_marathon.webp',
      defaultPosterUrl: 'https://example.com/posters/pinkrun.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: '21c8f56b-61fb-4cf7-bee7-6ed6f2bb9256',
      name: 'The Wandering Rose Concert',
      description: 'Đêm nhạc thính phòng acoustic The Wandering Rose lãng mạn tại không gian Đà Lạt.',
      artistName: 'The Wandering Rose',
      venueName: 'Đà Lạt Opera House',
      venueAddress: 'Quảng trường Lâm Viên, Phường 10, TP. Đà Lạt',
      eventDate: new Date('2026-10-24T19:30:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Live Music',
      city: 'Tỉnh Lâm Đồng',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/thumbnail_the wandering rose.webp',
      s3Key: 'posters/wandering_rose.webp',
      defaultPosterUrl: 'https://example.com/posters/rose.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: '1951e227-e6ca-4aa4-ac0d-09e8e8920d4e',
      name: 'The Next Live Show',
      description: 'Sân khấu âm nhạc đặc biệt The Next tập hợp các tài năng âm nhạc trẻ triển vọng.',
      artistName: 'The Next',
      venueName: 'Nhà hát Hòa Bình',
      venueAddress: '240 Đường 3 Tháng 2, Quận 10, TP. Hồ Chí Minh',
      eventDate: new Date('2026-10-31T20:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Live Music',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/thumbnail_thenext.webp',
      s3Key: 'posters/the_next_show.webp',
      defaultPosterUrl: 'https://example.com/posters/next.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'f28f92c2-0c17-425e-9d3f-4b27d53741f5',
      name: 'Ngày Hội Sen Huế 2026',
      description: 'Lễ hội văn hóa ẩm thực truyền thống giới thiệu vẻ đẹp và các sản phẩm từ Sen Huế.',
      artistName: 'Sen Huế',
      venueName: 'Trung tâm Hội nghị Quốc gia',
      venueAddress: '57 Phạm Hùng, Nam Từ Liêm, Hà Nội',
      eventDate: new Date('2027-05-21T08:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Festival',
      city: 'Thành phố Hà Nội',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/ngay-hoi-sen-hue-2105-bg-thumbnail.webp',
      s3Key: 'posters/sen_hue.webp',
      defaultPosterUrl: 'https://example.com/posters/sen_hue.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: '93f22cd0-9803-48b7-87b9-23a4d8ed9d48',
      name: 'Luminix Event 2026',
      description: 'Trải nghiệm âm thanh và ánh sáng nghệ thuật đỉnh cao của lễ hội Luminix.',
      artistName: 'Luminix',
      venueName: 'Cung Điền kinh Mỹ Đình',
      venueAddress: 'Đường Trần Hữu Dực, Cầu Diễn, Nam Từ Liêm, TP. Hà Nội',
      eventDate: new Date('2026-11-05T19:30:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Music Festival',
      city: 'Thành phố Hà Nội',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/LUMINIX-thumpnail.webp',
      s3Key: 'posters/luminix_event.webp',
      defaultPosterUrl: 'https://example.com/posters/luminix.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: '7b3400a6-be97-4fb3-97c0-750d0aaecba2',
      name: 'Giữa Một Vạn Tour - Chapter Four (Chặng 4)',
      description: 'Đêm nhạc "Giữa Một Vạn Tour - Chapter Four" của ca sĩ Phùng Khánh Linh.',
      artistName: 'Phùng Khánh Linh',
      venueName: 'Trung tâm Hội nghị Quốc gia',
      venueAddress: '57 Phạm Hùng, Nam Từ Liêm, Hà Nội',
      eventDate: new Date('2026-08-09T19:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Live Music',
      city: 'Thành phố Hà Nội',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/chang4_thumbnail_1600 x 900.webp',
      s3Key: 'posters/giua_mot_van_tour_c4.webp',
      defaultPosterUrl: 'https://example.com/posters/giua_mot_van_tour.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'a0f72df0-c3d5-4299-b005-87cdda37afb1',
      name: 'T1 In Vietnam - The Promise Fulfilled',
      description: 'Đại nhạc hội và ngày hội giao lưu người hâm mộ T1 tại Việt Nam.',
      artistName: 'T1',
      venueName: 'Trung tâm Triển lãm Việt Nam VEC',
      venueAddress: 'Trung tâm Triển lãm Việt Nam VEC, TP. Hồ Chí Minh',
      eventDate: new Date('2025-12-20T09:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Gaming',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/0712_1600x900.webp',
      s3Key: 'posters/t1_promise_fulfilled.webp',
      defaultPosterUrl: 'https://example.com/posters/t1.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: '56221c5f-3312-4fb3-beef-e67c8cb312d8',
      name: 'Saigon Sake Fest 2025',
      description: 'Lễ hội văn hóa ẩm thực và thưởng thức rượu Sake truyền thống Nhật Bản tại Sài Gòn.',
      artistName: 'Various Artists',
      venueName: 'Terrace, 2nd Floor, New World Hotel',
      venueAddress: '76 Lê Lai, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      eventDate: new Date('2025-12-13T18:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Festival',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/1111_1600X900.webp',
      s3Key: 'posters/saigon_sake_fest.webp',
      defaultPosterUrl: 'https://example.com/posters/sake.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'd60897f2-1b12-4cfb-8e15-8a9d8cb19f07',
      name: 'VPIM 2026 Hanoi Vibes',
      description: 'Giải chạy marathon quốc tế VPBank Hanoi International Marathon 2026 nâng cao tinh thần thể thao.',
      artistName: 'VPIM',
      venueName: 'Hồ Hoàn Kiếm',
      venueAddress: 'Hoàn Kiếm, Hà Nội',
      eventDate: new Date('2026-10-18T06:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Sport',
      city: 'Thành phố Hà Nội',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/2506_VIPM_1600x900.webp',
      s3Key: 'posters/vpim_hanoi_vibes.webp',
      defaultPosterUrl: 'https://example.com/posters/vpim.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'a78f2cb2-e3cb-4d92-bb8a-df9c23bf9a82',
      name: 'Hương Sắc Giai Nhân',
      description: 'Đại nhạc hội thu hình trực tiếp tụ hội các danh ca hàng đầu Việt Nam.',
      artistName: 'Hương Lan, Họa Mi, Như Quỳnh',
      venueName: 'Nhà hát Hòa Bình',
      venueAddress: '240 Đường 3 Tháng 2, Quận 10, TP. Hồ Chí Minh',
      eventDate: new Date('2025-12-27T19:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Live Music',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/2710_1600x900.webp',
      s3Key: 'posters/huong_sac_giai_nhan.webp',
      defaultPosterUrl: 'https://example.com/posters/huong_sac.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'f2c8d2a6-b6fb-4c12-8e4d-2a8f9c7b9a52',
      name: 'AirAsia The Next Live Concert 2026 Đà Nẵng',
      description: 'Đại nhạc hội AirAsia The Next hoành tráng dành cho giới trẻ tại Đà Nẵng.',
      artistName: 'The Next',
      venueName: 'Cung Thể thao Tiên Sơn',
      venueAddress: 'Hải Châu, Đà Nẵng',
      eventDate: new Date('2026-05-10T19:30:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Live Music',
      city: 'Thành phố Đà Nẵng',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/2803_Thumbnail.webp',
      s3Key: 'posters/airasia_the_next_danang.webp',
      defaultPosterUrl: 'https://example.com/posters/airasia_next.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: '3b8fa7c2-9e8a-4b92-ae7d-e6b7c2d9a5b3',
      name: 'Sơn.K - The First Fan Meeting 2026: Hello Capo',
      description: 'Buổi gặp gỡ fan hâm mộ đầu tiên của ca sĩ Sơn.K trong chuỗi sự kiện Hello Capo.',
      artistName: 'Sơn.K',
      venueName: 'Capital Theatre',
      venueAddress: '212 Lý Chính Thắng, Quận 3, TP. Hồ Chí Minh',
      eventDate: new Date('2026-01-04T19:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Fan Meeting',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/hello capo 1600x900.webp',
      s3Key: 'posters/sonk_hello_capo.webp',
      defaultPosterUrl: 'https://example.com/posters/sonk.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'a1c8f56b-61fb-4cf7-bee7-6ed6f2bb9257',
      name: 'The Wandering Rose - Trung Quân & Vicky Nhung',
      description: 'Đêm nhạc thính phòng acoustic lãng mạn giữa mây ngàn Ba Vi của The Wandering Rose.',
      artistName: 'Trung Quân, Vicky Nhung, Chu Thúy Quỳnh',
      venueName: 'The Wandering Rose Villa Ba Vi',
      venueAddress: 'Yên Bài, Ba Vì, Hà Nội',
      eventDate: new Date('2025-11-08T17:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Live Music',
      city: 'Thành phố Hà Nội',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/1600x900 (1).webp',
      s3Key: 'posters/wandering_rose_bavi_1.webp',
      defaultPosterUrl: 'https://example.com/posters/rose_bavi_1.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'ab917d37-1e31-4144-8f4d-d5fc3868ae6f',
      name: 'The Brothers Live Show',
      description: 'Sân khấu kết hợp bùng nổ của nhóm nghệ sĩ The Brothers gồm Hà Lê, Đỗ Hoàng Hiệp, Tăng Phúc và Liên Bỉnh Phát.',
      artistName: 'Hà Lê, Đỗ Hoàng Hiệp, Tăng Phúc, Liên Bỉnh Phát',
      venueName: 'The Opera',
      venueAddress: 'Lô 18A Lê Hồng Phong, Đằng Lâm, Hải An, Hải Phòng',
      eventDate: new Date('2026-01-17T19:30:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Live Music',
      city: 'Thành phố Hải Phòng',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/1600x900 (2).webp',
      s3Key: 'posters/the_brothers.webp',
      defaultPosterUrl: 'https://example.com/posters/brothers.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'd7f72df0-c3d5-4299-b005-87cdda37afb3',
      name: 'Đấu Trường SAM - Kiệt tác ánh sáng và Gió',
      description: 'Sự kiện thi đấu kết hợp nghệ thuật ánh sáng và âm thanh hoành tráng.',
      artistName: 'SAM Arena',
      venueName: 'Trung tâm Triển lãm Việt Nam VEC',
      venueAddress: 'Trung tâm Triển lãm Việt Nam VEC, TP. Hồ Chí Minh',
      eventDate: new Date('2026-03-08T18:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Event',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/1600x900 (4).webp',
      s3Key: 'posters/dau_truong_sam.webp',
      defaultPosterUrl: 'https://example.com/posters/sam.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: '9bd15adf-5483-4be6-a653-8d9f07c2712e',
      name: 'Ravolution Music Festival - Ravo 10 Years',
      description: 'Đại nhạc hội EDM Ravolution kỷ niệm chặng đường 10 năm phát triển và thăng hoa âm nhạc điện tử.',
      artistName: 'Ravolution DJs',
      venueName: 'SECC',
      venueAddress: '799 Nguyễn Văn Linh, Tân Phú, Quận 7, TP. Hồ Chí Minh',
      eventDate: new Date('2026-06-13T19:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Music Festival',
      city: 'Thành phố Hồ Chí Minh',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/1600x900 (5).webp',
      s3Key: 'posters/ravolution_10_years.webp',
      defaultPosterUrl: 'https://example.com/posters/ravo.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: '2520d45b-f52e-40c1-9ba7-fcfae6524cd9',
      name: 'Hoà Minzy Fan Concert - Bắc Bling',
      description: 'Buổi biểu diễn ấm cúng kết hợp gặp gỡ người hâm mộ chính thức của ca sĩ Hòa Minzy.',
      artistName: 'Hòa Minzy',
      venueName: 'Cung Văn hóa Hữu nghị Việt Xô',
      venueAddress: '91 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
      eventDate: new Date('2026-06-20T19:30:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Fan Concert',
      city: 'Thành phố Hà Nội',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/1600x900 (7).webp',
      s3Key: 'posters/hoa_minzy_bac_bling.webp',
      defaultPosterUrl: 'https://example.com/posters/hoa_minzy.webp',
      zones: [],
      ticketTypes: [],
    },
    {
      id: 'a1c8f56b-61fb-4cf7-bee7-6ed6f2bb9258',
      name: 'The Wandering Rose - Hoàng Dũng & Song Luân',
      description: 'Đêm nhạc thính phòng acoustic lãng mạn mùa Giáng Sinh giữa mây ngàn Ba Vì của The Wandering Rose.',
      artistName: 'Anh Quân Idol, Hoàng Dũng, Song Luân',
      venueName: 'The Wandering Rose Villa Ba Vi',
      venueAddress: 'Yên Bài, Ba Vì, Hà Nội',
      eventDate: new Date('2025-12-27T17:00:00.000Z'),
      status: ConcertStatus.PUBLISHED,
      type: 'Live Music',
      city: 'Thành phố Hà Nội',
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: '../fixtures/1600x900_2712.webp',
      s3Key: 'posters/wandering_rose_bavi_2.webp',
      defaultPosterUrl: 'https://example.com/posters/rose_bavi_2.webp',
      zones: [],
      ticketTypes: [],
    },
  ];

  const defaultZones: ZoneSeedData[] = [
    { code: 'svip', name: 'SVIP', color: '#e5484d', svgElementId: 'zone-svip' },
    { code: 'vip', name: 'VIP', color: '#e0a82e', svgElementId: 'zone-vip' },
    { code: 'cat1', name: 'CAT1', color: '#3d6f8f', svgElementId: 'zone-cat1' },
    { code: 'cat2', name: 'CAT2', color: '#123c3a', svgElementId: 'zone-cat2' },
    { code: 'ga', name: 'GA', color: '#64748b', svgElementId: 'zone-ga' },
  ];

  const defaultTicketTypeTemplates = [
    { name: 'SVIP', price: '2000000', totalQuantity: 50, maxPerUser: 4 },
    { name: 'VIP', price: '1500000', totalQuantity: 50, maxPerUser: 4 },
    { name: 'CAT1', price: '1000000', totalQuantity: 50, maxPerUser: 4 },
    { name: 'CAT2', price: '700000', totalQuantity: 50, maxPerUser: 4 },
    { name: 'GA', price: '400000', totalQuantity: 50, maxPerUser: 4 },
  ];

  // Generate a deterministic UUID v4-compliant ID from stable seed parts.
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
  function generateDeterministicUuid(...seedParts: string[]): string {
    const hash = crypto.createHash('sha256').update(seedParts.join('-')).digest('hex');
    const part1 = hash.substring(0, 8);
    const part2 = hash.substring(8, 12);
    // group3: must start with '4' (UUID v4)
    const part3 = '4' + hash.substring(13, 16);
    // group4: must start with 8, 9, a, or b (UUID variant)
    const variantChars = ['8', '9', 'a', 'b'];
    const variantChar = variantChars[parseInt(hash[16], 16) % 4];
    const part4 = variantChar + hash.substring(17, 20);
    const part5 = hash.substring(20, 32);
    return `${part1}-${part2}-${part3}-${part4}-${part5}`;
  }

  function toTitleFromFixtureName(fileName: string): string {
    const rawName = path.parse(fileName).name;
    const normalized = rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[_()[\]{}.,-]+/g, ' ')
      .replace(/\b(1600|900|5760|1728|800|450|px|thumbnail|thumb|cover|banner|copy|queue|slider|home|email)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return 'TicketBox Live Event';
    }

    return normalized
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  function buildFixtureConcert(fileName: string, index: number): ConcertSeedData {
    const venueProfiles = [
      {
        venueName: 'Nhà hát Hòa Bình',
        venueAddress: '240 Đường 3 Tháng 2, Quận 10, TP. Hồ Chí Minh',
        city: 'Thành phố Hồ Chí Minh',
      },
      {
        venueName: 'Cung Văn hóa Hữu nghị Việt Xô',
        venueAddress: '91 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
        city: 'Thành phố Hà Nội',
      },
      {
        venueName: 'Cung Thể thao Tiên Sơn',
        venueAddress: 'Hải Châu, Đà Nẵng',
        city: 'Thành phố Đà Nẵng',
      },
      {
        venueName: 'Nhà thi đấu Nguyễn Du',
        venueAddress: '116 Nguyễn Du, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
        city: 'Thành phố Hồ Chí Minh',
      },
      {
        venueName: 'Trung tâm Hội nghị Quốc gia',
        venueAddress: '57 Phạm Hùng, Nam Từ Liêm, Hà Nội',
        city: 'Thành phố Hà Nội',
      },
      {
        venueName: 'Đà Lạt Opera House',
        venueAddress: 'Quảng trường Lâm Viên, Phường 10, TP. Đà Lạt',
        city: 'Tỉnh Lâm Đồng',
      },
      {
        venueName: 'SECC',
        venueAddress: '799 Nguyễn Văn Linh, Tân Phú, Quận 7, TP. Hồ Chí Minh',
        city: 'Thành phố Hồ Chí Minh',
      },
      {
        venueName: 'The Opera Hải Phòng',
        venueAddress: 'Lô 18A Lê Hồng Phong, Đằng Lâm, Hải An, Hải Phòng',
        city: 'Thành phố Hải Phòng',
      },
    ];
    const eventProfiles = [
      { type: 'Live Music', artistName: 'Various Artists', hour: 19 },
      { type: 'Music Festival', artistName: 'TicketBox Festival Artists', hour: 18 },
      { type: 'Fan Meeting', artistName: 'Featured Artist', hour: 14 },
      { type: 'Festival', artistName: 'Community Artists', hour: 8 },
      { type: 'Gaming', artistName: 'Esports Guests', hour: 13 },
      { type: 'Sport', artistName: 'Sport Community', hour: 6 },
      { type: 'Event', artistName: 'Special Guests', hour: 17 },
      { type: 'Theatre', artistName: 'Stage Ensemble', hour: 20 },
    ];

    const venue = venueProfiles[index % venueProfiles.length];
    const event = eventProfiles[index % eventProfiles.length];
    const title = toTitleFromFixtureName(fileName);
    const paddedIndex = String(index + 1).padStart(3, '0');
    const id = generateDeterministicUuid('fixture-concert', fileName);
    const extension = path.extname(fileName).slice(1).toLowerCase() || 'jpg';
    const posterSlug = slugify(`${paddedIndex}-${title}`) || `fixture-event-${paddedIndex}`;
    const eventDate = new Date(Date.UTC(2026 + Math.floor(index / 36), (6 + index) % 12, (index % 24) + 1, event.hour, 0, 0));

    return {
      id,
      name: `Fixture Live ${paddedIndex} - ${title}`,
      description: `Sự kiện ${event.type.toLowerCase()} được seed từ ảnh fixture "${fileName}", có đầy đủ poster, địa điểm, lịch diễn, khu vực ghế và hạng vé để kiểm thử giao diện TicketBox.`,
      artistName: event.artistName,
      venueName: venue.venueName,
      venueAddress: venue.venueAddress,
      eventDate,
      status: ConcertStatus.PUBLISHED,
      type: event.type,
      city: venue.city,
      seatMapSvgUrl: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
      posterLocalPath: `../fixtures/${fileName}`,
      s3Key: `posters/fixtures/${posterSlug}.${extension}`,
      defaultPosterUrl: `https://example.com/posters/fixtures/${posterSlug}.${extension}`,
      zones: [],
      ticketTypes: [],
    };
  }

  const alreadySeededPosterPaths = new Set([
    ticketBoxLiveConcert.posterLocalPath,
    ...webpConcerts.map((concert) => concert.posterLocalPath),
  ]);
  const fixturesDir = path.resolve(__dirname, '../fixtures');
  const unseededFixtureConcerts = fs
    .readdirSync(fixturesDir)
    .filter((fileName) => /\.(webp|jpe?g|png|gif)$/i.test(fileName))
    .filter((fileName) => !alreadySeededPosterPaths.has(`../fixtures/${fileName}`))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName, index) => buildFixtureConcert(fileName, index));
  const concertsToSeed = [...webpConcerts, ...unseededFixtureConcerts];

  for (const cData of concertsToSeed) {
    cData.seatMapSvgLocalPath = '../fixtures/seatmap_template (2).svg';
    cData.zones = defaultZones;
    cData.ticketTypes = defaultTicketTypeTemplates.map(tpl => ({
      id: generateDeterministicUuid(cData.id, tpl.name),
      name: tpl.name,
      price: tpl.price,
      totalQuantity: tpl.totalQuantity,
      maxPerUser: tpl.maxPerUser,
    }));
    await seedConcert(cData);
  }

  console.log('\n==================================================================');
  console.log('REAL FIXTURE CONCERTS SEEDED SUCCESSFULLY.');
  console.log(`Stable Concert ID: ${ticketBoxLiveConcert.id}`);
  console.log(`Hard-coded fixture concerts: ${webpConcerts.length}`);
  console.log(`Auto-generated unseeded fixture concerts: ${unseededFixtureConcerts.length}`);
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
