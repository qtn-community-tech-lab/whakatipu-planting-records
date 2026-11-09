/**
 * The Supabase project the live tests read: your .env.local if you have one, otherwise the
 * public URL and publishable key committed in .env. The first file to set a value wins.
 *
 * Without a project the live tests skip. On CI that would pass with nothing checked, so it fails instead.
 */
for (const file of [".env.local", ".env"]) {
  try { process.loadEnvFile(file); } catch {}
}

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const live = !!url && !!key;

if (!live && process.env.CI) {
  throw new Error("No Supabase project for the live tests: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}
