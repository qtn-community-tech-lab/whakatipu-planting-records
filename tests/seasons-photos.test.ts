import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { q, presentationCells } from "./helpers";
import SeasonsPage from "@/app/seasons/page";
import SeasonPage from "@/app/seasons/[slug]/page";

const mocks = vi.hoisted(() => ({ season: vi.fn(), seasons: vi.fn(), leaders: vi.fn() }));
vi.mock("@/db/client", () => ({ db: () => { throw new Error("Pages must use named history queries"); } }));
vi.mock("@/db/queries/auth", () => ({ isAuthenticated: async () => false }));
vi.mock("@/lib/wrt/server", () => ({
  reviewShown: async () => true,
}));
vi.mock("@/lib/wrt/public-server", () => ({
  getPublicWrt: () => ({ season: mocks.season, seasons: mocks.seasons, seasonLeaders: mocks.leaders }),
}));

const photos = [{
  src: "https://example.com/database-photo.jpg", attribution: "Database photographer · CC BY 4.0",
  sourceUrl: "https://example.com/source", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
}];
const slug = "autumn-2024";

beforeEach(async () => {
  vi.clearAllMocks();
  const detail = (await q.season(slug))!;
  const records = detail.records.map((row) => ({ ...row, species: { ...row.species, photos } }));
  mocks.season.mockResolvedValue({ ...detail, records: [], cells: presentationCells(records) });
  mocks.seasons.mockResolvedValue(await q.seasons());
  mocks.leaders.mockResolvedValue({
    species: [{ season: slug, species: { ...detail.species[0]!.item, photos }, split: detail.species[0]!.split }],
    sites: detail.places.map((row) => ({ season: slug, slug: row.item.slug, name: row.item.name, split: row.split })),
  });
});

it("shows season leaders' database photos using only scoped summary queries", async () => {
  const html = renderToStaticMarkup(await SeasonsPage());
  expect(html).toContain(photos[0]!.src);
  expect(mocks.leaders).toHaveBeenCalledOnce();
  expect(mocks.season).not.toHaveBeenCalled();
});

it("renders register photos from a season's grouped presentation without raw line reads", async () => {
  const html = renderToStaticMarkup(await SeasonPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) }));
  expect(html).toContain(photos[0]!.src);
  expect(mocks.season).toHaveBeenCalledWith(slug);
  expect(mocks.leaders).not.toHaveBeenCalled();
});
