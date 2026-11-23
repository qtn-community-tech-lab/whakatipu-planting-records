import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/db/types";
import { speciesSchema } from "@/db/types";
import speciesSeed from "@/data/species.json";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/db/client", () => ({ db: mocks.db }));

import { createSpecies, updateSpecies, deactivateSpecies } from "@/db/queries/species";
import { createSite, updateSite, deactivateSite, createPlantingArea, updatePlantingArea } from "@/db/queries/sites";
import { createPlantingEvent, createPlantingLines, updatePlantingEvent, updatePlantingLine, deactivatePlantingEvent, deactivatePlantingLines } from "@/db/queries/plantings";
import { createUser, updateUser, deactivateUser, reactivateUser } from "@/db/queries/users";

const actor = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-11-24T01:00:00.000Z";
const spoofed = { created_by: "untrusted", updated_by: "untrusted", updated_at: "2000-01-01T00:00:00.000Z" };
const species = { ...speciesSchema.parse(speciesSeed[0]), ...spoofed };
const site = { slug: "audit-site", name: "Audit site", description: "", areas: [], ...spoofed };
const area = { slug: "audit-area", name: "Audit area", description: "", ...spoofed };
const user = { name: "Audit user", email: "audit@example.org", ...spoofed };
const event = { area: area.slug, season: 0, planted_on: "2015-04-01", notes: "", ...spoofed };
const lines = [{ species: species.slug, quantity: 12, ...spoofed }, { species: "other-species", quantity: 8, ...spoofed }];
const edit = { site: site.slug, area: area.slug, plantedOn: null, type: null, notes: "", lines: [{ id: 11, species: species.slug, quantity: 12 }] };
const fetch = vi.fn<typeof globalThis.fetch>();

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(timestamp));
  fetch.mockReset();
  fetch.mockImplementation(async (input) => {
    if (String(input).endsWith("/rpc/current_app_user_id")) return json(actor);
    return json({ id: 7, slug: site.slug });
  });
  mocks.db.mockResolvedValue(createClient<Database>("https://example.supabase.co", "test-key", {
    auth: { persistSession: false }, global: { fetch },
  }));
});

afterEach(() => vi.useRealTimers());

const mutations = [
  { name: "createSpecies", table: "species", method: "POST", run: () => createSpecies(species), audit: { created_by: actor, updated_by: actor } },
  { name: "createSite", table: "sites", method: "POST", run: () => createSite(site), audit: { created_by: actor, updated_by: actor } },
  { name: "createPlantingArea", table: "areas", method: "POST", run: () => createPlantingArea(site.slug, area), audit: { created_by: actor, updated_by: actor } },
  { name: "createPlantingEvent", table: "planting_events", method: "POST", run: () => createPlantingEvent(event), audit: { created_by: actor, updated_by: actor } },
  { name: "createPlantingLines", table: "planting_lines", method: "POST", run: () => createPlantingLines(7, lines), audit: { created_by: actor, updated_by: actor } },
  { name: "createUser", table: "users", method: "POST", run: () => createUser(user), audit: { created_by: actor, updated_by: actor } },
  { name: "updateSpecies", table: "species", method: "PATCH", run: () => updateSpecies(species.slug, species), audit: { updated_by: actor } },
  { name: "updateSite", table: "sites", method: "PATCH", run: () => updateSite(site.slug, site), audit: { updated_by: actor } },
  { name: "updatePlantingArea", table: "areas", method: "PATCH", run: () => updatePlantingArea(site.slug, area.slug, area), audit: { updated_by: actor } },
  { name: "updatePlantingLine", table: "planting_lines", method: "PATCH", run: () => updatePlantingLine(7, 11, { quantity: 12, ...spoofed }), audit: { updated_by: actor } },
  { name: "updateUser", table: "users", method: "PATCH", run: () => updateUser("target-user", user), audit: { updated_by: actor } },
  { name: "deactivateSpecies", table: "species", method: "PATCH", run: () => deactivateSpecies(species.slug), audit: { updated_by: actor, deactivated_by: actor, deactivated_at: expect.any(String) } },
  { name: "deactivateSite", table: "sites", method: "PATCH", run: () => deactivateSite(site.slug), audit: { updated_by: actor, deactivated_by: actor, deactivated_at: expect.any(String) } },
  { name: "deactivatePlantingEvent", table: "planting_events", method: "PATCH", run: () => deactivatePlantingEvent(7), audit: { updated_by: actor, deactivated_by: actor, deactivated_at: expect.any(String) } },
  { name: "deactivatePlantingLines", table: "planting_lines", method: "PATCH", run: () => deactivatePlantingLines(7, [11, 12]), audit: { updated_by: actor, deactivated_by: actor, deactivated_at: expect.any(String) } },
  { name: "deactivateUser", table: "users", method: "PATCH", run: () => deactivateUser("target-user"), audit: { updated_by: actor, deactivated_by: actor, deactivated_at: expect.any(String) } },
  { name: "reactivateUser", table: "users", method: "PATCH", run: () => reactivateUser("target-user"), audit: { updated_by: actor, deactivated_by: null, deactivated_at: null } },
];

describe("mutation attribution", () => {
  it.each(mutations)("$name uses the session's app user ID", async ({ run, table, method, audit }) => {
    const result = await run();
    expect(result.error).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    const [input, options] = fetch.mock.calls[1]!;
    expect(new URL(String(input)).pathname).toBe(`/rest/v1/${table}`);
    expect(options?.method).toBe(method);
    const body = JSON.parse(String(options?.body));
    const rows: Record<string, unknown>[] = Array.isArray(body) ? body : [body];
    expect(rows).toHaveLength(Array.isArray(body) ? lines.length : 1);
    for (const row of rows) {
      expect(row).toMatchObject({ ...audit, updated_at: timestamp });
      if (method === "POST") expect(row.created_at).toBe(timestamp);
      if ("deactivated_at" in audit && audit.deactivated_at !== null) {
        expect(row.deactivated_at).toBe(timestamp);
      }
    }
  });

  it.each(mutations)("$name does not write when there is no approved current user", async ({ run }) => {
    fetch.mockResolvedValue(json(null));
    await expect(run()).rejects.toThrow("Staff sign-in required.");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("propagates an identity lookup failure without writing", async () => {
    fetch.mockResolvedValue(json({ code: "42501", message: "Permission denied" }, 403));
    await expect(createUser(user)).rejects.toMatchObject({ code: "42501" });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("returns a failed write for the action to handle and permits retry", async () => {
    fetch.mockResolvedValueOnce(json(actor)).mockResolvedValueOnce(json({ code: "23505", message: "Duplicate slug" }, 409));
    expect((await createSite(site)).error).toMatchObject({ code: "23505" });
    expect((await createSite(site)).error).toBeNull();
  });

  it("keeps event edits in one RPC that derives its audit user inside the transaction", async () => {
    expect((await updatePlantingEvent(7, edit)).error).toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
    const [input, options] = fetch.mock.calls[0]!;
    expect(new URL(String(input)).pathname).toBe("/rest/v1/rpc/update_planting_event");
    expect(JSON.parse(String(options?.body))).toEqual({
      event_id: 7, site_slug: site.slug, area_slug: area.slug,
      planted_on: null, planting_type: null, notes: "", lines: edit.lines,
    });
  });
});
