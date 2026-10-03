import { describe, expect, it } from "vitest";
import { primaryName, withMacrons } from "@/lib/wrt/display-names";
import { repo } from "./helpers";

describe("withMacrons", () => {
  it("restores macrons word by word", () => {
    expect(withMacrons("Ti kouka")).toBe("Tī kōuka");
    expect(withMacrons("manuka")).toBe("Mānuka");
    expect(withMacrons("Kowhai")).toBe("Kōwhai");
    expect(withMacrons("Halls Totara")).toBe("Halls tōtara");
  });
  it("rewrites split and joined words", () => {
    expect(withMacrons("Toe toe")).toBe("Toetoe");
  });
  it("leaves unlisted words as the register spells them", () => {
    expect(withMacrons("Cabbage tree")).toBe("Cabbage tree");
  });
  it("returns null for empty input", () => {
    expect(withMacrons(null)).toBeNull();
    expect(withMacrons(undefined)).toBeNull();
    expect(withMacrons("   ")).toBeNull();
  });
});

describe("primaryName", () => {
  it("takes the first of several alternatives", () => {
    expect(primaryName("Purei, or Pukio")).toBe("Purei");
    expect(primaryName("Kanuka or Manuka")).toBe("Kanuka");
    expect(primaryName("Toetoe, Plumed grass")).toBe("Toetoe");
  });
  it("keeps a single name whole", () => {
    expect(primaryName("Cabbage tree")).toBe("Cabbage tree");
  });
  it("is null for empty input", () => {
    expect(primaryName(null)).toBeNull();
    expect(primaryName("")).toBeNull();
  });
  it("composes with withMacrons", () => {
    expect(withMacrons(primaryName("Purei, or Pukio"))).toBe("Pūrei");
  });
});

describe("species display names in the repository", () => {
  it("shows macrons for well-known species", async () => {
    const species = await repo.listSpecies();
    const manuka = species.find((s) => s.slug === "leptospermum-scoparium");
    const kowhai = species.find((s) => s.slug === "sophora-microphylla");
    expect(manuka?.displayName).toBe("Mānuka");
    expect(kowhai?.displayName).toBe("Kōwhai");
  });

  it("never shows a display name that the overlay would still change", async () => {
    // If a displayed Māori or common name still contains an un-macronised word
    // the overlay knows about, the overlay was skipped for it.
    const species = await repo.listSpecies();
    for (const s of species) {
      for (const shown of [s.maoriName, s.commonName]) {
        if (!shown) continue;
        expect(withMacrons(shown), `${s.slug}: "${shown}"`).toBe(shown);
      }
    }
  });

  it("falls back to the scientific name only when there is no other name", async () => {
    const species = await repo.listSpecies();
    for (const s of species) {
      if (s.displayIsScientific) {
        expect(s.maoriName).toBeNull();
        expect(s.commonName).toBeNull();
        expect(s.displayName).toBe(s.scientificName);
      } else {
        expect(s.displayName).toBe(s.maoriName ?? s.commonName);
      }
    }
  });

  it("keeps join keys and search keys free of macrons", async () => {
    const species = await repo.listSpecies();
    for (const s of species) {
      expect(s.slug).toMatch(/^[a-z0-9-]+$/);
      for (const k of s.searchKeys) expect(k).toMatch(/^[a-z0-9 ]+$/);
    }
  });
});
