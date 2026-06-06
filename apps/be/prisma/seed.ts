import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import {
  Permission,
  PrismaClient,
  Role,
  ScopeType,
  UserStatus,
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
  'concert:create',
  'concert:update',
  'concert:publish',
  'concert:cancel',
  'concert:complete',
  'ticket:purchase',
  'ticket:read_own',
  'ticket:scan',
  'revenue:read',
  'guestlist:import',
  'audit:read',
  'user:manage',
] as const;

const roles = ['admin', 'organizer', 'checkin_staff', 'audience'] as const;

const rolePermissions = {
  admin: [
    'concert:read',
    'concert:create',
    'concert:update',
    'concert:publish',
    'concert:cancel',
    'concert:complete',
    'ticket:purchase',
    'ticket:read_own',
    'ticket:scan',
    'revenue:read',
    'guestlist:import',
    'audit:read',
    'user:manage',
  ],
  organizer: [
    'concert:read',
    'concert:create',
    'concert:update',
    'concert:publish',
    'concert:cancel',
    'concert:complete',
    'revenue:read',
    'guestlist:import',
  ],
  checkin_staff: ['concert:read', 'ticket:scan'],
  audience: ['concert:read', 'ticket:purchase', 'ticket:read_own'],
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

async function seedAdminUser(roleByName: Map<string, Role>): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_FULL_NAME ?? 'System Admin';

  if (!email || !password) {
    console.log(
      'Skipping admin user seed: SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD is missing.',
    );
    return;
  }

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
        fullName,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(
      `Admin user ${email} already exists. Password was not overwritten.`,
    );
  } else {
    console.log(`Created admin user ${email}.`);
  }

  await upsertUserRole({
    userId: adminUser.id,
    roleId: adminRole.id,
    scopeType: ScopeType.GLOBAL,
    scopeId: null,
  });
}

async function upsertUserRole(params: {
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId: string | null;
}): Promise<void> {
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: params.userId,
      roleId: params.roleId,
      scopeType: params.scopeType,
      scopeId: params.scopeId,
    },
  });

  if (existingUserRole) {
    return;
  }

  await prisma.userRole.create({
    data: {
      userId: params.userId,
      roleId: params.roleId,
      scopeType: params.scopeType,
      scopeId: params.scopeId,
    },
  });
}

async function main(): Promise<void> {
  const permissionByCode = await seedPermissions();
  const roleByName = await seedRoles();

  await seedRolePermissions(roleByName, permissionByCode);
  await seedAdminUser(roleByName);

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
