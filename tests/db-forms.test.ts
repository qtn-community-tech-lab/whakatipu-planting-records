import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentFiles } from "@/db/content";
import { plantingDayForm } from "@/db/usecases/record-planting-day";
import { pinChanges } from "@/db/usecases/place-pin";

describe("content files match their zod schemas", () => {
  for (const [file, schema] of Object.entries(contentFiles)) {
    it(file, () => {
      const data = JSON.parse(readFileSync(path.join("data", file), "utf8"));
      const result = schema.safeParse(data);
      expect(result.success ? [] : result.error.issues.slice(0, 5)).toEqual([]);
    });
  }
});

describe("planting day form", () => {
  const valid = {
    siteAreaId: 77, seasonId: 24, plantingDate: "2026-09-19", eventType: "infill" as const,
    notes: "", isPublic: false, lines: [{ speciesId: 152, quantity: 40 }, { speciesId: 50, quantity: null }],
  };

  it("accepts a real day, including a species not yet counted", () => {
    expect(plantingDayForm.safeParse(valid).success).toBe(true);
  });

  it("needs a real date", () => {
    expect(plantingDayForm.safeParse({ ...valid, plantingDate: "2026-02-30" }).success).toBe(false);
  });

  it("rejects negative quantities and the same species twice", () => {
    expect(plantingDayForm.safeParse({ ...valid, lines: [{ speciesId: 152, quantity: -1 }] }).success).toBe(false);
    const twice = plantingDayForm.safeParse({ ...valid, lines: [{ speciesId: 152, quantity: 1 }, { speciesId: 152, quantity: 2 }] });
    expect(twice.success).toBe(false);
    expect(twice.error?.issues[0]?.message).toBe("Add each species once");
  });

  it("needs at least one species", () => {
    expect(plantingDayForm.safeParse({ ...valid, lines: [] }).success).toBe(false);
  });
});

describe("pins", () => {
  it("rejects a radius of zero and an impossible latitude", () => {
    expect(pinChanges.safeParse({ latitude: -45, longitude: 168.7, radiusM: 120 }).success).toBe(true);
    expect(pinChanges.safeParse({ radiusM: 0 }).success).toBe(false);
    expect(pinChanges.safeParse({ latitude: -95 }).success).toBe(false);
  });
});
