"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../src/generated/prisma");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
}
const prisma = new prisma_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString }),
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
];
const roles = ['customer', 'admin', 'checker'];
const deprecatedRoles = ['organizer', 'checkin_staff', 'audience'];
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
};
async function seedPermissions() {
    const createdPermissions = await Promise.all(permissions.map((code) => prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code },
    })));
    return new Map(createdPermissions.map((permission) => [permission.code, permission]));
}
async function seedRoles() {
    const createdRoles = await Promise.all(roles.map((name) => prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
    })));
    return new Map(createdRoles.map((role) => [role.name, role]));
}
async function seedRolePermissions(roleByName, permissionByCode) {
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
async function cleanupRolesAndPermissions(roleByName, permissionByCode) {
    for (const [roleName, allowedPermissionCodes] of Object.entries(rolePermissions)) {
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
async function seedAdminUser(roleByName) {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const fullName = process.env.SEED_ADMIN_FULL_NAME ?? 'System Admin';
    if (!email || !password) {
        console.log('Skipping admin user seed: SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD is missing.');
        return;
    }
    const adminRole = roleByName.get('admin');
    if (!adminRole) {
        throw new Error('Missing admin role');
    }
    const existingAdmin = await prisma.user.findUnique({
        where: { email },
    });
    const adminUser = existingAdmin ??
        (await prisma.user.create({
            data: {
                email,
                password: await bcrypt_1.default.hash(password, 10),
                fullName,
                status: prisma_1.UserStatus.ACTIVE,
            },
        }));
    if (existingAdmin) {
        await prisma.user.update({
            where: { id: existingAdmin.id },
            data: {
                fullName,
                status: prisma_1.UserStatus.ACTIVE,
            },
        });
        console.log(`Admin user ${email} already exists. Password was not overwritten.`);
    }
    else {
        console.log(`Created admin user ${email}.`);
    }
    await upsertUserRole({
        userId: adminUser.id,
        roleId: adminRole.id,
    });
}
async function upsertUserRole(params) {
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
async function main() {
    const permissionByCode = await seedPermissions();
    const roleByName = await seedRoles();
    await seedRolePermissions(roleByName, permissionByCode);
    await cleanupRolesAndPermissions(roleByName, permissionByCode);
    await seedAdminUser(roleByName);
    console.log('RBAC seed completed.');
}
main()
    .catch((error) => {
    console.error('RBAC seed failed:', error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
