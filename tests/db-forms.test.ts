import { describe, expect, it } from "vitest";
import { plantingDay } from "@/db/usecases/record-planting-day";
import { pinChanges } from "@/db/usecases/place-pin";

describe("planting day form", () => {
  const valid = {
    site_area_id: 77, season_id: 24, planting_date: "2026-09-19", event_type: "infill" as const,
    notes: "", is_public: false, lines: [{ species_id: 152, quantity: 40 }, { species_id: 50, quantity: null }],
  };

  it("accepts a real day, including a species not yet counted", () => {
    expect(plantingDay.safeParse(valid).success).toBe(true);
  });

  it("needs a real date", () => {
    expect(plantingDay.safeParse({ ...valid, planting_date: "2026-02-30" }).success).toBe(false);
  });

  it("rejects negative quantities and the same species twice", () => {
    expect(plantingDay.safeParse({ ...valid, lines: [{ species_id: 152, quantity: -1 }] }).success).toBe(false);
    const twice = plantingDay.safeParse({ ...valid, lines: [{ species_id: 152, quantity: 1 }, { species_id: 152, quantity: 2 }] });
    expect(twice.success).toBe(false);
    expect(twice.error?.issues[0]?.message).toBe("Add each species once");
  });

  it("needs at least one species", () => {
    expect(plantingDay.safeParse({ ...valid, lines: [] }).success).toBe(false);
  });
});

describe("pins", () => {
  it("rejects a radius of zero and an impossible latitude", () => {
    expect(pinChanges.safeParse({ latitude: -45, longitude: 168.7, radius_m: 120 }).success).toBe(true);
    expect(pinChanges.safeParse({ radius_m: 0 }).success).toBe(false);
    expect(pinChanges.safeParse({ latitude: -95 }).success).toBe(false);
  });
});
