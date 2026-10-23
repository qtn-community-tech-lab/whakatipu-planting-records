import { describe, expect, it } from "vitest";
import type { Db } from "@/db/types";
import { plantingEventTypes } from "@/db/enums";
import { domainId, generateUniqueID, IdPrefixes } from "@/db/ids";
import { answerQuestion } from "@/db/usecases/answer-review-question";
import { updateSpecies } from "@/db/usecases/edit-species";
import { pinChanges, retirePin, updatePin } from "@/db/usecases/place-pin";
import { addLine, plantingDay, retireLine, savePlantingDay, setQuantity } from "@/db/usecases/record-planting-day";

describe("shared domain IDs", () => {
  it("accepts every generated table prefix and existing database-generated IDs", () => {
    for (const prefix of Object.values(IdPrefixes)) {
      expect(domainId.safeParse(generateUniqueID(prefix)).success).toBe(true);
    }
    expect(domainId.safeParse("0123456789ABCDEF").success).toBe(true);
  });
});

describe("planting day form", () => {
  const valid = {
    site_id: "site000000000001", planting_area_id: "area000000000001", season_id: "season0000000001", planting_date: "2026-09-19", event_type: "infill" as const,
    notes: "", is_public: false, lines: [{ species_id: "species000000001", quantity: 40 }, { species_id: "species000000002", quantity: null }],
  };

  it("accepts a real day, including a species not yet counted", () => {
    expect(plantingDay.safeParse(valid).success).toBe(true);
  });

  it("accepts the database's event types, including an unknown type, and rejects other values", () => {
    for (const event_type of [...plantingEventTypes, null, undefined]) {
      expect(plantingDay.safeParse({ ...valid, event_type }).success).toBe(true);
    }
    expect(plantingDay.safeParse({ ...valid, event_type: "allocation" }).success).toBe(false);
  });

  it("needs a real date", () => {
    expect(plantingDay.safeParse({ ...valid, planting_date: "2026-02-30" }).success).toBe(false);
    expect(plantingDay.safeParse({ ...valid, planting_date: null }).success).toBe(false);
    expect(plantingDay.safeParse({ ...valid, planting_date: undefined }).success).toBe(false);
  });

  it("rejects negative quantities and the same species twice", () => {
    expect(plantingDay.safeParse({ ...valid, lines: [{ species_id: "species000000001", quantity: -1 }] }).success).toBe(false);
    const twice = plantingDay.safeParse({ ...valid, lines: [{ species_id: "species000000001", quantity: 1 }, { species_id: "species000000001", quantity: 2 }] });
    expect(twice.success).toBe(false);
    expect(twice.error?.issues[0]?.message).toBe("Add each species once");
  });

  it("needs at least one species", () => {
    expect(plantingDay.safeParse({ ...valid, lines: [] }).success).toBe(false);
  });

  it.each(["site_id", "planting_area_id", "season_id"])("rejects an invalid %s before saving", (field) => {
    const result = plantingDay.safeParse({ ...valid, [field]: "short" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });

  it("validates nested species IDs and keeps the area optional", () => {
    expect(plantingDay.safeParse({ ...valid, lines: [{ species_id: "short", quantity: 1 }] }).success).toBe(false);
    expect(plantingDay.safeParse({ ...valid, planting_area_id: null }).success).toBe(true);
    expect(plantingDay.safeParse({ ...valid, planting_area_id: undefined }).success).toBe(true);
  });
});

describe("pins", () => {
  it("rejects a radius of zero and an impossible latitude", () => {
    expect(pinChanges.safeParse({ geometry: { type: "Point", coordinates: [168.7, -45] }, radius_m: 120 }).success).toBe(true);
    expect(pinChanges.safeParse({ radius_m: 0 }).success).toBe(false);
    expect(pinChanges.safeParse({ geometry: { type: "Point", coordinates: [168.7, -95] } }).success).toBe(false);
  });
});

describe("use cases check their own input", () => {
  // Throws on any use: a bad input must be rejected before the database is reached.
  const untouched = new Proxy({}, { get: () => { throw new Error("database touched"); } }) as Db;

  it("rejects a bad planting day, line or count", async () => {
    await expect(savePlantingDay(untouched, { site_id: "site000000000001", season_id: "season0000000001", planting_date: "2026-09-19", lines: [] }))
      .rejects.toThrow("Add at least one species");
    await expect(addLine(untouched, "event00000000001", { species_id: "species000000001", quantity: -1 })).rejects.toThrow("Can't be negative");
    await expect(setQuantity(untouched, "line000000000001", "lots")).rejects.toThrow();
  });

  it("rejects a species change that isn't allowed and a pin with no radius", async () => {
    await expect(updateSpecies(untouched, "carex-secta", { slug: "renamed" })).rejects.toThrow();
    await expect(updatePin(untouched, "loc_000000000001", { radius_m: 0 })).rejects.toThrow("Radius must be more than 0 m");
  });

  it("rejects invalid standalone IDs before touching Supabase", async () => {
    await expect(updatePin(untouched, "short", {})).rejects.toThrow("ID must be 16 characters");
    await expect(retirePin(untouched, "short")).rejects.toThrow("ID must be 16 characters");
    await expect(addLine(untouched, "short", { species_id: "spc_000000000001", quantity: 1 }))
      .rejects.toThrow("ID must be 16 characters");
    await expect(setQuantity(untouched, "short", 1)).rejects.toThrow("ID must be 16 characters");
    await expect(retireLine(untouched, "short")).rejects.toThrow("ID must be 16 characters");
  });

  it("rejects a ruling with no words", async () => {
    await expect(answerQuestion(untouched, "slope-hill-2024", { decision: " ", decided_on: "2026-10-22", decided_by: "WRT" }))
      .rejects.toThrow("Write WRT's ruling");
  });
});
