import { describe, expect, it } from "vitest";
import { SupabaseWrtRepository } from "@/db/repository";
import type { Db } from "@/db/types";
import profile from "@/data/species-profiles.json";
import photos from "@/data/species-photos.json";
import { defined } from "./assertions";

const firstProfile = defined(profile[0]);

async function speciesFromDb(reference: { profile: object; photos: object[]; deactivated_at?: string | null }) {
  const selected: string[] = [];
  const db = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      const query = {
        select: (columns: string) => { if (table === "species") selected.push(columns); return query; },
        order: () => query, is: (key: string, value: unknown) => { filters.push([key, value]); return query; }, range: () => query,
        throwOnError: async () => ({ data: table === "species" ? [{
          slug: "database-species", register_code: firstProfile.speciesId,
          scientific_name: firstProfile.scientificName, deactivated_at: null, ...reference,
        }].filter((row) => filters.every(([key, value]) => row[key as keyof typeof row] === value)) : [] }),
      };
      return query;
    },
  } as unknown as Db;
  const result = await new SupabaseWrtRepository(() => db).listSpecies();
  expect(selected[0]).toContain("profile, photos");
  return defined(result[0]);
}

describe("database species references", () => {
  it("uses saved profiles and ordered images rather than catalogue content", async () => {
    const savedProfile = { ...firstProfile, summary: "Description from the database." };
    const savedPhotos = photos.slice(0, 2).reverse().map((photo) => ({
      src: photo.src, attribution: `${photo.author} · ${photo.license}`,
      sourceUrl: photo.sourceUrl, licenseUrl: photo.licenseUrl,
    }));
    const species = await speciesFromDb({ profile: savedProfile, photos: savedPhotos });
    expect(species.profile).toEqual(savedProfile);
    expect(species.photos).toEqual(savedPhotos);
  });

  it("keeps empty database references empty even for a catalogued species", async () => {
    const species = await speciesFromDb({ profile: {}, photos: [] });
    expect(species.profile).toBeNull();
    expect(species.photos).toEqual([]);
  });

  it("loads retired species for historical joins and exposes the saved timestamp", async () => {
    const deactivated_at = "2026-11-09T00:00:00.000Z";
    const species = await speciesFromDb({ profile: {}, photos: [], deactivated_at });
    expect(species.deactivatedAt).toBe(deactivated_at);
    expect(species.id).toBe(profile[0].speciesId);
  });
});
