import { describe, expect, it } from "vitest";
import type { Db } from "@/db/types";
import { answerQuestion } from "@/db/usecases/answer-review-question";
import { updateSpecies } from "@/db/usecases/edit-species";
import { pinChanges, updatePin } from "@/db/usecases/place-pin";
import { addLine, plantingDay, savePlantingDay, setQuantity } from "@/db/usecases/record-planting-day";

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

describe("use cases check their own input", () => {
  // Throws on any use: a bad input must be rejected before the database is reached.
  const untouched = new Proxy({}, { get: () => { throw new Error("database touched"); } }) as Db;

  it("rejects a bad planting day, line or count", async () => {
    await expect(savePlantingDay(untouched, { site_area_id: 77, season_id: 24, planting_date: "2026-09-19", lines: [] }))
      .rejects.toThrow("Add at least one species");
    await expect(addLine(untouched, 1, { species_id: 152, quantity: -1 })).rejects.toThrow("Can't be negative");
    await expect(setQuantity(untouched, 1, "lots")).rejects.toThrow();
  });

  it("rejects a species change that isn't allowed and a pin with no radius", async () => {
    await expect(updateSpecies(untouched, "carex-secta", { slug: "renamed" })).rejects.toThrow();
    await expect(updatePin(untouched, "x", { radius_m: 0 })).rejects.toThrow("Radius must be more than 0 m");
  });

  it("rejects a ruling with no words", async () => {
    await expect(answerQuestion(untouched, "slope-hill-2024", { decision: " ", decided_on: "2026-10-22", decided_by: "WRT" }))
      .rejects.toThrow("Write WRT's ruling");
  });
});
