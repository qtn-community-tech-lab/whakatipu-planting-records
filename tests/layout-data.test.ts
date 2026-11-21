import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LayoutSummary } from "@/db/queries/layout";
import { matchScore } from "@/lib/wrt/text";

const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/queries/layout", () => ({ readLayoutSummary: read }));
// Any accidental return to the full history loader must fail this test.
vi.mock("@/lib/wrt/server", () => { throw new Error("Layout must not load planting history"); });

import { readLayoutData } from "@/lib/wrt/layout-data";

const summary: LayoutSummary = {
  siteCount: 41, speciesCount: 93, records: 5444,
  seasons: [
    { slug: "autumn-2025", label: "Autumn 2025", year: 2025, half: "autumn", total: 12, needsReview: 2, records: 2 },
    { slug: "spring-2025", label: "Spring 2025", year: 2025, half: "spring", total: 0, needsReview: 0, records: 1 },
  ],
  places: [
    { slug: "reserve", name: "Reserve", total: 12, terms: ["Reserve", "East Kōwhai", "Old\\nReserve"] },
  ],
  species: [
    { slug: "kowhai", scientificName: "Sophora microphylla", suggestedSpelling: null, commonName: null,
      maoriName: "Kōwhai", total: 12, terms: ["Sophora microphylla", "Old Kōwhai spelling"] },
    { slug: "new-species", scientificName: "New species", suggestedSpelling: "Suggested spelling", commonName: null,
      maoriName: null, total: 0, terms: [] },
  ],
};

beforeEach(() => { read.mockReset(); read.mockResolvedValue(structuredClone(summary)); });

describe("layout presentation from aggregate data", () => {
  it("loads only the named summary query and preserves counts, range and growth rings", async () => {
    const result = await readLayoutData(true);
    expect(read).toHaveBeenCalledExactlyOnceWith(true);
    expect(result.counts).toEqual({ sites: "41", species: "93", seasons: "2", records: "5,444" });
    expect(result.range).toBe("Autumn 2025 → Spring 2025");
    expect(result.rings).toEqual([
      { slug: "autumn-2025", label: "Autumn 2025", autumn: true, total: 12, needsReview: 2 },
      { slug: "spring-2025", label: "Spring 2025", autumn: false, total: 0, needsReview: 0 },
    ]);
    expect(result.index.seasons).toHaveLength(2); // Unknown/zero quantities still have records.
  });

  it("preserves historical aliases and macron-tolerant search without profile content", async () => {
    const { index } = await readLayoutData(true);
    expect(index.places[0]?.keys).toEqual(["reserve", "east kowhai", "old reserve"]);
    expect(matchScore("old reserve", index.places[0]!.keys)).toBe(100);
    expect(matchScore("old kowhai spelling", index.species[0]!.keys)).toBe(100);
    expect(index.species[0]).toMatchObject({ name: "Kōwhai", scientific: "Sophora microphylla", isScientific: false });
    expect(index.species[1]).toMatchObject({ name: "New species", isScientific: true, total: 0 });
    expect(index.species[1]?.keys).toContain("suggested spelling");
  });

  it("passes review scope to the database and keeps zero-valued historical seasons in the rings", async () => {
    const scoped = structuredClone(summary);
    scoped.records = 1;
    scoped.places = [];
    scoped.seasons[0] = { ...scoped.seasons[0]!, total: 10, needsReview: 0, records: 1 };
    scoped.seasons[1] = { ...scoped.seasons[1]!, records: 0 };
    read.mockResolvedValue(scoped);
    const result = await readLayoutData(false);
    expect(read).toHaveBeenCalledExactlyOnceWith(false);
    expect(result.counts.records).toBe("1");
    expect(result.rings).toHaveLength(2);
    expect(result.index.seasons.map((season) => season.slug)).toEqual(["autumn-2025"]);
    expect(result.index.places).toEqual([]);
  });

  it("recovers from empty history on the next read, retaining unplanted reference species", async () => {
    read.mockResolvedValueOnce({ ...summary, records: 0, seasons: [], places: [] });
    const empty = await readLayoutData(true);
    expect(empty.range).toBe("No planting history yet");
    expect(empty.counts.records).toBe("0");
    expect(empty.rings).toEqual([]);
    expect(empty.index.species).toHaveLength(2);
    expect((await readLayoutData(true)).counts.records).toBe("5,444");
  });

  it("propagates read failures instead of presenting empty or stale history", async () => {
    read.mockRejectedValue(new Error("Database unavailable"));
    await expect(readLayoutData(true)).rejects.toThrow("Database unavailable");
  });
});
