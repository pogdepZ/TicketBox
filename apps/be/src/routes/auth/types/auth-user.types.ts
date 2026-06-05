import { Prisma } from '../../../generated/prisma';

export const authUserInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{
  include: typeof authUserInclude;
  omit: {
    password: true;
  };
}>;

export type UserWithRolesAndPassword = Prisma.UserGetPayload<{
  include: typeof authUserInclude;
}>;
