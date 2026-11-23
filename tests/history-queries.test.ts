import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicHistoryQueries } from "@/db/queries/public-history";

const species = {
  slug: "kowhai", register_code: "SP-TEST", scientific_name: "Sophora microphylla", suggested_spelling: null,
  common_name: null, maori_name: "Kōwhai", status: "core", over_5m: true, threatened: false,
  threatened_te_kakano: false, contested_group: null, needs_decision: false, deactivated_at: null,
  aliases: ["Old Kōwhai spelling"], photos: [{ src: "https://example.com/kowhai.jpg", attribution: "Test photographer" }],
};
const references = {
  seasons: [{ id: 0, slug: "autumn-2025", label: "Autumn 2025", year: 2025, half: "autumn", workbook_total: 17, workbook_cell: "A1" }],
  sites: [{ slug: "reserve", name: "Reserve", description: "Beside the river", deactivated_at: null, classes: ["community"] }],
  areas: [{ slug: "east", site: "reserve", name: "East", wrt_number: "9A", class: "community", deactivated_at: null, aliases: ["Old reserve"] }],
  species: [species],
};
const split = { total: 17, resolved: 12, needsReview: 5, records: 2, recordsNeedingReview: 1 };
const totals = { ...split, sites: 1, species: 1, seasons: 1, firstSeason: 0, lastSeason: 0 };

const requests: { path: string; body: Record<string, unknown>; cache: RequestCache | undefined }[] = [];
let empty = false;
let fail = false;

beforeEach(() => {
  empty = false; fail = false; requests.length = 0;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const path = new URL(String(input)).pathname;
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    requests.push({ path, body, cache: init?.cache });
    if (fail) return new Response(JSON.stringify({ code: "42501", message: "Permission denied" }), { status: 403 });
    let result: unknown;
    if (path.endsWith("/read_history_references")) result = empty ? { seasons: [], sites: [], areas: [], species: [] } : references;
    else if (path.endsWith("/read_planting_summary")) {
      const dimensions = body.group_by as string[];
      result = empty ? { totals: { total: 0, resolved: 0, needsReview: 0, records: 0, recordsNeedingReview: 0,
        sites: 0, species: 0, seasons: 0, firstSeason: null, lastSeason: null }, rows: [] } : {
        totals,
        rows: [{ site: dimensions.includes("site") ? "reserve" : null,
          area: dimensions.includes("area") ? "east" : null, species: dimensions.includes("species") ? "kowhai" : null,
          season: dimensions.includes("season") ? "autumn-2025" : null,
          class: dimensions.includes("class") ? "community" : null, precision: dimensions.includes("precision") ? "site" : null,
          confidence: dimensions.includes("confidence") ? "high" : null, theme: dimensions.includes("theme") ? "other" : null,
          split, siteCount: 1, speciesCount: 1, seasonCount: 1, firstSeason: 0, lastSeason: 0 }],
      };
    } else throw new Error(`Unexpected unbounded history request: ${path}`);
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  });
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("targeted history query boundaries", () => {
  it("gets public register summaries and exact counts without downloading records", async () => {
    const result = await createPublicHistoryQueries().speciesList("names");
    expect(result[0]?.split).toEqual(split);
    expect(result[0]?.item).toMatchObject({ slug: "kowhai", displayName: "Kōwhai" });
    expect(result[0]?.span?.first.label).toBe("Autumn 2025");
    expect(requests.find((request) => request.path.endsWith("/read_planting_summary"))?.body).toEqual({
      group_by: ["species"], filters: {}, show_review: true,
    });
    expect(requests.every((request) => request.path.includes("/rpc/") && request.cache === "no-store")).toBe(true);
  });

  it("preserves historical parcel quantities without loading retired review rows", async () => {
    const detail = await createPublicHistoryQueries().place("reserve", { parcel: "9A" });
    expect(detail?.split).toEqual(split);
    expect(detail?.parcels[0]?.item).toMatchObject({ id: "9A", slug: "east" });
    expect(detail?.cells[0]?.split).toEqual(split);
    expect(detail?.records).toEqual([]);
    expect(requests.every((request) => request.body.show_review !== false)).toBe(true);
    expect(requests.some((request) => (request.body.group_by as string[] | undefined)?.includes("theme"))).toBe(false);
    expect(requests.some((request) => request.path.endsWith("/read_public_review_rows"))).toBe(false);
  });

  it("shares identical aggregate and reference reads within a request", async () => {
    const queries = createPublicHistoryQueries();
    await Promise.all([queries.speciesList("names"), queries.speciesList("names")]);
    expect(requests.filter((request) => request.path.endsWith("/read_planting_summary"))).toHaveLength(1);
    expect(requests.filter((request) => request.path.endsWith("/read_history_references"))).toHaveLength(1);
  });

  it("opens a renamed area by its fixed slug and preserves its historical quantities", async () => {
    const area = references.areas[0]!;
    const originalName = area.name;
    area.name = "Renamed east bank";
    try {
      const detail = await createPublicHistoryQueries().place("reserve", { part: "east" });
      expect(detail?.parcels[0]?.item).toMatchObject({ slug: "east", id: "9A", name: area.name });
      expect(detail?.split).toEqual(split);
      expect(detail?.cells[0]?.split).toEqual(split);
      expect(requests.some((request) => request.path.endsWith("/read_public_review_rows"))).toBe(false);
    } finally {
      area.name = originalName;
    }
  });

  it("searches compact public summaries using historical aliases and macrons", async () => {
    const result = await createPublicHistoryQueries().search("old kowhai spelling");
    expect(result.species[0]?.item.slug).toBe("kowhai");
    expect(requests.some((request) => request.path.endsWith("/read_public_review_rows"))).toBe(false);
  });

  it("recovers on the next request after an empty database is populated", async () => {
    empty = true;
    expect((await createPublicHistoryQueries().overview()).split.records).toBe(0);
    empty = false;
    expect((await createPublicHistoryQueries().overview()).split).toEqual(split);
  });

  it("does not hide failed reads behind empty summaries", async () => {
    fail = true;
    await expect(createPublicHistoryQueries().speciesList("names")).rejects.toMatchObject({ code: "42501" });
  });
});
