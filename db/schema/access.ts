/**
 * Shared building blocks: the edit trail every editable table carries, and the
 * access rules. Written once here so every table states its rules the same way.
 */
import { sql, type SQL } from "drizzle-orm";
import { pgPolicy, timestamp, uuid } from "drizzle-orm/pg-core";
import { anonRole, authenticatedRole } from "drizzle-orm/supabase";
import { profiles } from "./people";

/**
 * Who created and last changed a row, and whether it is retired.
 * `created_by` / `updated_by` are null for rows written by the history import.
 * A trigger (migration 0002) keeps `updated_at` / `updated_by` current.
 * Rows are never deleted by the app: set `deactivated_at` instead.
 */
export const editTrail = () => ({
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid().default(sql`auth.uid()`).references(() => profiles.id),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid().references(() => profiles.id),
  deactivatedAt: timestamp({ withTimezone: true }),
});

/** True when the signed-in user is active staff. Defined in migration 0000. */
const isStaff = sql`(select public.is_staff())`;

/** Staff can read, add and change rows. Nobody deletes: they deactivate. */
export const staffAccess = () => [
  pgPolicy("staff read", { for: "select", to: authenticatedRole, using: isStaff }),
  pgPolicy("staff insert", { for: "insert", to: authenticatedRole, withCheck: isStaff }),
  pgPolicy("staff update", { for: "update", to: authenticatedRole, using: isStaff, withCheck: isStaff }),
];

/** Anyone, signed in or not, can read rows that pass `using`. */
export const publicRead = (using: SQL) =>
  pgPolicy("public read", { for: "select", to: [anonRole, authenticatedRole], using });

/** Read-only for staff: the legacy layer is only ever written by the import. */
export const staffReadOnly = () => [
  pgPolicy("staff read", { for: "select", to: authenticatedRole, using: isStaff }),
];
