/**
 * People who can sign in. Supabase Auth owns the account (auth.users); this
 * table adds what WRT needs to know about them. Staff are added by an admin;
 * sign-in is invite-only (signInWithOtp with shouldCreateUser: false).
 *
 * No imports from ./access here: access.ts points at this table.
 */
import { sql } from "drizzle-orm";
import { boolean, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

export const profiles = pgTable("profiles", {
  id: uuid().primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text().notNull(),
  /** Staff can edit; everyone else can only read what is published. */
  isStaff: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  deactivatedAt: timestamp({ withTimezone: true }),
}, (t) => [
  // People see their own profile; staff see everyone's. Admins edit through the dashboard.
  pgPolicy("own or staff read", {
    for: "select",
    to: authenticatedRole,
    using: sql`${t.id} = (select auth.uid()) or (select public.is_staff())`,
  }),
]);
