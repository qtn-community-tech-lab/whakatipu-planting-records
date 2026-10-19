import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  casing: "snake_case",
  schemaFilter: ["public", "legacy"],
  // Supabase already has the anon / authenticated / service_role roles: don't manage them.
  entities: { roles: { provider: "supabase" } },
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
