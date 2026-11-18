/**
 * Seed the maintained register without docs/ or a development-database export.
 *
 * npm run seed-species                         validate and preview offline
 * npm run seed-species -- --write              insert missing species only
 * npm run seed-species -- --write --backfill    also update maintained scientific names and threat flags,
 *                                             and fill empty common/Māori names, profiles and photos
 *
 * Run after import-workbook: that legacy importer can restore its original names
 * and spreadsheet threat marks. This script never reads planting history or
 * uses development-database values to construct the seed.
 */
import { createClient } from "@supabase/supabase-js";
import { isDeepStrictEqual } from "node:util";
import type { Database } from "../db/database.types";
import { readSpeciesSeed, speciesBackfillValues, speciesSeedRows } from "./species/seed";

async function main() {
  const write = process.argv.includes("--write");
  const backfill = process.argv.includes("--backfill");
  const seed = readSpeciesSeed();
  const rows = speciesSeedRows();
  const verified = seed.filter((entry) => entry.threatened !== null);
  console.log(`${rows.length} species from data/species.json; ${verified.length} verified NZTCS flags, ${rows.length - verified.length} unresolved matches.`);
  console.log(`${verified.filter((entry) => entry.threatened).length} register entries have a verified Threatened flag. Unresolved matches have no threatened flag.`);
  if (!write) {
    console.log("Dry run: validated offline; no database connection or writes. Use --write to insert missing species; add --backfill to update scientific names and threatened flags and fill empty common/Māori names, profiles and photos.");
    return;
  }

  try { process.loadEnvFile(".env.local"); } catch {}
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  const db = createClient<Database>(url, key, { auth: { persistSession: false } });

  // Check identities and current values before changing any rows.
  const { data: existing, error: readError } = await db
    .from("species")
    .select("slug, register_code, scientific_name, suggested_spelling, threatened, common_name, maori_name, profile, photos")
    .order("slug")
    .limit(1000);
  if (readError) throw new Error(`read species identifiers: ${readError.message}`);
  if (existing.length === 1000) throw new Error("Species identifier check reached 1,000 rows; page this check before seeding a larger register.");
  for (const row of rows) {
    const conflict = existing.find((item) =>
      (item.slug === row.slug && item.register_code !== row.register_code)
      || (item.register_code === row.register_code && item.slug !== row.slug));
    if (conflict) throw new Error(`Identifier conflict for ${row.register_code} / ${row.slug}; resolve it before seeding.`);
  }

  // Ignore existing rows, including deactivated ones. Names, notes, photos and flags edited in the app survive reruns.
  const { data: inserted, error: insertError } = await db
    .from("species")
    .upsert(rows, { onConflict: "slug", ignoreDuplicates: true })
    .select("slug");
  if (insertError) throw new Error(`seed species: ${insertError.message}`);
  console.log(`Inserted ${inserted.length} species; existing species were preserved.`);

  if (backfill) {
    const bySlug = new Map(existing.map((row) => [row.slug, row]));
    let changed = 0;
    const filled = { common_name: 0, maori_name: 0, profile: 0, photos: 0 };
    for (const row of rows) {
      const current = bySlug.get(row.slug);
      if (!current) continue;
      const values = speciesBackfillValues(row, current);
      if (Object.entries(values).every(([key, value]) => isDeepStrictEqual(current[key as keyof typeof current], value))) continue;
      const { error } = await db
        .from("species")
        .update(values)
        .eq("slug", row.slug)
        .eq("register_code", row.register_code)
        .select("slug")
        .single();
      if (error) throw new Error(`backfill ${row.slug}: ${error.message}. Earlier updates may have completed; rerunning is safe.`);
      changed++;
      for (const key of Object.keys(filled) as (keyof typeof filled)[]) {
        if (values[key] !== undefined) filled[key]++;
      }
    }
    console.log(`Backfilled ${changed} species. Filled ${filled.common_name} common names, ${filled.maori_name} Māori names, ${filled.profile} profiles and ${filled.photos} photo sets.`);
    console.log("All slugs, existing common/Māori names and reference content, notes and deactivation state were preserved.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
