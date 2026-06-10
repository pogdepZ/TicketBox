/*
  Warnings:

  - You are about to drop the column `scope_id` on the `user_roles` table. All the data in the column will be lost.
  - You are about to drop the column `scope_type` on the `user_roles` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "user_roles_scope_type_scope_id_idx";

-- AlterTable
ALTER TABLE "user_roles" DROP COLUMN "scope_id",
DROP COLUMN "scope_type";

-- DropEnum
DROP TYPE "ScopeType";
