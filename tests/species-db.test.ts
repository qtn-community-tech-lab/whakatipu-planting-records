import { describe, expect, it } from "vitest";
import { SupabaseWrtRepository } from "@/db/repository";
import type { Db } from "@/db/types";
import profile from "@/data/species-profiles.json";
import photos from "@/data/species-photos.json";

async function speciesFromDb(reference: { profile: object; photos: object[] }) {
  const selected: string[] = [];
  const db = {
    from(table: string) {
      const query = {
        select: (columns: string) => { if (table === "species") selected.push(columns); return query; },
        order: () => query, is: () => query, range: () => query,
        throwOnError: async () => ({ data: table === "species" ? [{
          slug: "database-species", register_code: profile[0].speciesId,
          scientific_name: profile[0].scientificName, ...reference,
        }] : [] }),
      };
      return query;
    },
  } as unknown as Db;
  const result = await new SupabaseWrtRepository(() => db).listSpecies();
  expect(selected[0]).toContain("profile, photos");
  return result[0];
}

describe("database species references", () => {
  it("uses saved profiles and ordered images rather than catalogue content", async () => {
    const savedProfile = { ...profile[0], summary: "Description from the database." };
    const savedPhotos = photos.slice(0, 2).reverse();
    const species = await speciesFromDb({ profile: savedProfile, photos: savedPhotos });
    expect(species.profile).toEqual(savedProfile);
    expect(species.photos).toEqual(savedPhotos);
  });

  it("keeps empty database references empty even for a catalogued species", async () => {
    const species = await speciesFromDb({ profile: {}, photos: [] });
    expect(species.profile).toBeNull();
    expect(species.photos).toEqual([]);
  });
});
