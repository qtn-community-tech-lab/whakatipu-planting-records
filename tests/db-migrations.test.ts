/**
 * The database, tested without Docker. PGlite is real Postgres running in-process.
 * Every migration is applied in order, then the view, the save function, the edit
 * trail and the access rules are checked as staff, a volunteer and a signed-out visitor.
 * Stand-ins cover only what Supabase provides: the auth schema, auth.uid() and three roles.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = path.join(process.cwd(), "db", "migrations");
const STAFF = "11111111-1111-1111-1111-111111111111";
const VOLUNTEER = "22222222-2222-2222-2222-222222222222";
const SAVE = "select public.save_planting_day($1, $2, $3, $4, $5, $6, $7) as id";

let db: PGlite;
let ids: { area: number; season: number; kowhai: number; mingi: number };

async function as(user: string | null, role: "authenticated" | "anon" = "authenticated") {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ""}', false); set role ${role};`);
}
const lines = (...l: [number, number | null][]) => JSON.stringify(l.map(([species_id, quantity]) => ({ species_id, quantity })));

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
  `);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    for (const part of readFileSync(path.join(MIGRATIONS, file), "utf8").split("--> statement-breakpoint")) {
      if (part.trim()) await db.exec(part);
    }
  }
  await db.exec(`
    insert into auth.users values ('${STAFF}'), ('${VOLUNTEER}');
    insert into public.profiles (id, display_name, is_staff) values ('${STAFF}', 'Staff', true), ('${VOLUNTEER}', 'Volunteer', false);
    insert into public.sites (slug, name, is_public) values ('whitechapel', 'Whitechapel Reserve', true);
    insert into public.site_areas (site_id, slug, name, wrt_number, site_class, is_public)
      select id, 'whitechapel-north', 'Whitechapel north', '12A', 'community', true from public.sites;
    insert into public.site_locations (slug, site_id, site_area_id, label, latitude, longitude, accuracy)
      select 'whitechapel-north', site_id, id, 'North bank', -45.03, 168.66, 'landmark' from public.site_areas;
    insert into public.seasons (slug, year, name, label, sort_order) values ('autumn-2026', 2026, 'Autumn', 'Autumn 2026', 22);
    insert into public.species (slug, scientific_name, maori_name) values
      ('sophora-microphylla', 'Sophora microphylla', 'Kōwhai'), ('coprosma-propinqua', 'Coprosma propinqua', 'Mingimingi');
  `);
  ids = (await db.query<typeof ids>(`select (select id from public.site_areas) area, (select id from public.seasons) season,
    (select id from public.species where slug = 'sophora-microphylla') kowhai,
    (select id from public.species where slug = 'coprosma-propinqua') mingi`)).rows[0];
}, 60_000);

afterAll(() => db?.close());

describe("views used by db/queries", () => {
  it.each([
    ["area_list", "area, area_name, wrt_number, site_class, site, site_name, is_scheme, latitude, longitude, radius_m"],
    ["totals_by_species", "species, maori_name, scientific_name, plants, plants_resolved, plants_needs_review, sites"],
    ["totals_by_site", "site, site_name, plants, plants_resolved, plants_needs_review, species"],
    ["totals_by_season", "season, season_label, season_order, plants, plants_resolved, plants_needs_review, sites, species"],
    ["totals_by_review_topic", "topic, label, question, decision, plants_needs_review, lines_needs_review"],
    ["line_details", "line_id, event_id, season, season_label, season_order, planting_date, site, site_name, area, area_name, species, scientific_name, maori_name, year, quantity, needs_review, legacy_code"],
  ])("%s has every column the queries select", async (view, columns) => {
    await expect(db.query(`select ${columns} from public.${view} limit 0`)).resolves.toBeDefined();
  });

  it("area_list gives each area with its pin, flat", async () => {
    await as(STAFF);
    const { rows } = await db.query(`select site_name, area_name, wrt_number, latitude from public.area_list`);
    expect(rows).toEqual([{ site_name: "Whitechapel Reserve", area_name: "Whitechapel north", wrt_number: "12A", latitude: -45.03 }]);
  });
});

describe("save_planting_day", () => {
  let eventId: number;

  it("saves the event and its lines together, as staff", async () => {
    await as(STAFF);
    eventId = (await db.query<{ id: number }>(SAVE, [ids.area, ids.season, "2026-05-09", "infill", "", false, lines([ids.kowhai, 40], [ids.mingi, null])])).rows[0].id;
    const { rows } = await db.query(`select maori_name, quantity from public.line_details where event_id = $1 order by maori_name`, [eventId]);
    expect(rows).toEqual([{ maori_name: "Kōwhai", quantity: 40 }, { maori_name: "Mingimingi", quantity: null }]);
    const event = (await db.query(`select created_by::text, source::text from public.planting_events where id = $1`, [eventId])).rows[0];
    expect(event).toEqual({ created_by: STAFF, source: "app" });
  });

  it.each([
    ["the same species twice", "2026-05-10", () => lines([ids.kowhai, 1], [ids.kowhai, 2]), /one_line_per_species/],
    ["no date", null, () => lines([ids.kowhai, 1]), /new_events_have_a_date/],
    ["a negative count", "2026-05-10", () => lines([ids.kowhai, -5]), /quantity_not_negative/],
  ])("refuses %s and leaves nothing half-saved", async (_label, date, body, error) => {
    await as(STAFF);
    const count = async () => (await db.query<{ n: number }>(`select count(*)::int n from public.planting_events`)).rows[0].n;
    const before = await count();
    await expect(db.query(SAVE, [ids.area, ids.season, date, "infill", "", false, body()])).rejects.toThrow(error);
    expect(await count()).toBe(before);
  });

  it("records who edited a line, through the edit trail", async () => {
    await as(STAFF);
    await db.query(`update public.planting_lines set quantity = 25 where event_id = $1 and quantity is null`, [eventId]);
    const { rows } = await db.query(`select updated_by::text from public.planting_lines where event_id = $1 and quantity = 25`, [eventId]);
    expect(rows).toEqual([{ updated_by: STAFF }]);
  });

  it("refuses a signed-in volunteer", async () => {
    await as(VOLUNTEER);
    await expect(db.query(SAVE, [ids.area, ids.season, "2026-05-11", "infill", "", false, lines([ids.kowhai, 1])])).rejects.toThrow(/row-level security/);
  });

  it("refuses a signed-out visitor, who also cannot see unpublished lines", async () => {
    await as(null, "anon");
    await expect(db.query(SAVE, [ids.area, ids.season, "2026-05-11", "infill", "", false, lines([ids.kowhai, 1])])).rejects.toThrow(/permission denied/);
    expect((await db.query(`select * from public.line_details where event_id = $1`, [eventId])).rows).toEqual([]);
    expect((await db.query(`select * from public.area_list`)).rows).toHaveLength(1);
  });
});
