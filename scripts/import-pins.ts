/**
 * Copy the researched map pins (data/site-locations.json) onto their areas in Supabase.
 *
 *   npm run import-pins              # dry run: shows what would change, writes nothing
 *   npm run import-pins -- --write   # sets the pins
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local, like the workbook import.
 *
 * A pin with a WRT number goes on that area of its site. A pin for a whole site goes on the
 * site's area only when the site has just one; otherwise it is listed as skipped.
 * Only empty pins are filled: a pin someone has already set or moved is never changed.
 */
import { createClient } from "@supabase/supabase-js";
import pins from "../data/site-locations.json";

type Area = {
  slug: string; site: string; wrt_number: string | null; retired_at: string | null;
  lat: number | null; lng: number | null; pin_source_url: string | null; pin_checked_on: string | null;
};
type Pin = (typeof pins)[number] & { parcelIds?: string[] };

const write = process.argv.includes("--write");

async function main() {
  try { process.loadEnvFile(".env.local"); } catch {}
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db.from("areas")
    .select("slug, site, wrt_number, retired_at, lat, lng, pin_source_url, pin_checked_on");
  if (error) throw new Error(`read areas: ${error.message}`);
  const areas = (data as Area[]).filter((a) => a.retired_at === null);

  const set: { area: Area; pin: Pin }[] = [];
  const same: string[] = [], kept: string[] = [], skipped: string[] = [];
  const taken = new Set<string>();

  for (const pin of pins as Pin[]) {
    const ofSite = areas.filter((a) => a.site === pin.siteSlug);
    const number = pin.parcelIds?.[0];
    const area = number ? ofSite.find((a) => a.wrt_number === number) : ofSite.length === 1 ? ofSite[0] : undefined;
    if (!area) {
      skipped.push(`${pin.id}: ${number ? `no area ${number} in ${pin.siteSlug}` : `${pin.siteSlug} has ${ofSite.length} areas`}`);
      continue;
    }
    if (taken.has(area.slug)) { skipped.push(`${pin.id}: ${area.slug} already gets another pin`); continue; }
    taken.add(area.slug);
    if (area.lat === null && area.lng === null) set.push({ area, pin });
    else if (area.lat === pin.latitude && area.lng === pin.longitude) same.push(area.slug);
    else kept.push(`${area.slug} keeps its own pin (${area.lat}, ${area.lng})`);
  }

  // Count only rows the database says it changed. An area pinned by someone else since the read above matches nothing.
  const done = new Set<string>();
  if (write) {
    for (const { area, pin } of set) {
      const { data: rows, error: e } = await db.from("areas").update({
        lat: pin.latitude, lng: pin.longitude,
        pin_source_url: pin.coordinateSourceUrl || pin.sourceUrl, pin_checked_on: pin.checkedOn,
      }).eq("slug", area.slug).is("lat", null).select("slug");
      if (e) throw new Error(`write ${area.slug}: ${e.message}. Already written: ${[...done].join(", ") || "none"}`);
      if (rows.length) done.add(area.slug);
      else kept.push(`${area.slug} was pinned by someone else during this run, left alone`);
    }
  }
  const landed = write ? set.filter((s) => done.has(s.area.slug)) : set;

  console.log(write ? "Written:" : "Dry run, nothing written. Would change:");
  console.log(`  ${landed.length} pins set, ${same.length} already in place, ${kept.length} kept as they are, ${skipped.length} skipped`);
  for (const { area, pin } of landed) console.log(`  + ${area.slug.padEnd(40)} ${pin.latitude}, ${pin.longitude}  (${pin.id})`);
  for (const slug of same) console.log(`  . ${slug} already has this pin`);
  for (const line of kept) console.log(`  = ${line}`);
  for (const line of skipped) console.log(`  - ${line}`);
  console.log(`  (${pins.length} pins in data/site-locations.json, ${areas.length} live areas)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
