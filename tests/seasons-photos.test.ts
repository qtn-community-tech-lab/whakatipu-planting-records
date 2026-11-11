import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SeasonsPage from "@/app/seasons/page";
import SeasonPage from "@/app/seasons/[slug]/page";

const { readDb } = vi.hoisted(() => ({ readDb: vi.fn() }));
vi.mock("@/db/client", () => ({ db: readDb }));
vi.mock("@/lib/wrt/server", () => ({
  reviewShown: async () => true,
  getWrt: () => { throw new Error("Season photos must not load the full repository"); },
}));

const photos = [{
  src: "https://example.com/database-photo.jpg", attribution: "Database photographer · CC BY 4.0",
  sourceUrl: "https://example.com/source", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
}];
const species = { slug: "database-species", scientific_name: "Database species", common_name: null, maori_name: null, photos };
const season = {
  season: "autumn-2024", season_label: "Autumn 2024", season_order: 0, year: 2024,
  plants: 10, plants_confirmed: 10, plants_needs_review: 0, lines: 1, lines_needs_review: 0,
  sites: 1, species: 1, workbook_total: 10, workbook_cell: "A1",
};
const tables: Record<string, object[]> = {
  species: [species],
  totals_by_season: [season],
  season_species: [{ ...species, season: season.season, species: species.slug, plants: 10, rank: 1 }],
  season_sites: [{ season: season.season, site: "reserve", site_name: "Reserve", plants: 10, rank: 1 }],
  line_details: [{
    ...species, ...season, species: species.slug, line_id: 1, quantity: 10, needs_review: false,
    site: "reserve", site_name: "Reserve", area: "reserve-east", area_name: "East", class: "community",
    contested_group: null, notes: [],
  }],
};
const reads: { table: string; columns?: string; season?: string }[] = [];

beforeEach(() => {
  reads.length = 0;
  readDb.mockResolvedValue({
    from(table: string) {
      if (!tables[table]) throw new Error(`Unexpected full repository read: ${table}`);
      const read: (typeof reads)[number] = { table };
      reads.push(read);
      const query = {
        select: (columns: string) => { read.columns = columns; return query; },
        is: () => query, order: () => query, lte: () => query,
        eq: (column: string, value: string) => { if (column === "season") read.season = value; return query; },
        throwOnError: async () => ({ data: tables[table] }),
      };
      return query;
    },
  });
});

it("shows the season leaders' database photos without loading planting lines", async () => {
  const html = renderToStaticMarkup(await SeasonsPage());
  expect(html).toContain(photos[0]!.src);
  expect(reads.map((read) => read.table).sort()).toEqual(["season_sites", "season_species", "species", "totals_by_season"]);
  expect(reads.find((read) => read.table === "species")?.columns).toContain("photos");
});

it("joins register photos onto a season's lines without reading other seasons' lines", async () => {
  const html = renderToStaticMarkup(await SeasonPage({ params: Promise.resolve({ slug: season.season }), searchParams: Promise.resolve({}) }));
  expect(html).toContain(photos[0]!.src);
  expect(reads.map((read) => read.table).sort()).toEqual(["line_details", "species", "totals_by_season"]);
  expect(reads.find((read) => read.table === "line_details")?.season).toBe(season.season);
});
