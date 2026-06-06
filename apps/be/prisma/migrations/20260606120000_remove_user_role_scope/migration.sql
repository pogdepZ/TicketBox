-- Drop data-scope support from RBAC.
DROP INDEX IF EXISTS "user_roles_scope_type_scope_id_idx";

ALTER TABLE "user_roles"
  DROP COLUMN IF EXISTS "scope_type",
  DROP COLUMN IF EXISTS "scope_id";

DROP TYPE IF EXISTS "ScopeType";
