import { describe, expect, it } from "vitest";
import { readHistorySeeds } from "@/scripts/workbook/history";
import { readPlaceSeeds } from "@/scripts/workbook/places";
import { readSeasonSeeds } from "@/scripts/workbook/seasons";
import { readSpeciesSeed } from "@/scripts/species/seed";
import { REVIEW_THEMES } from "@/lib/wrt/review-themes";
import dump from "@/data/plantings.json";

const references = {
  areas: readPlaceSeeds().areas, seasons: readSeasonSeeds([]), species: readSpeciesSeed(),
  questions: Object.keys(REVIEW_THEMES).map((slug) => ({ slug })),
};

describe("nested planting seed", () => {
  it("preserves all seed fields and quantities without database identity IDs", () => {
    const plantings = readHistorySeeds(references);
    expect(plantings).toEqual(dump);
    const lines = plantings.flatMap((planting) => planting.lines);
    const notes = lines.flatMap((line) => line.notes);
    expect(plantings).toHaveLength(360);
    expect(lines).toHaveLength(5449);
    expect(notes).toHaveLength(1339);
    expect(lines.reduce((total, line) => total + (line.quantity ?? 0), 0)).toBe(140068);
    for (const row of [...plantings, ...lines, ...notes]) {
      expect(row).not.toHaveProperty("id");
      expect(row).not.toHaveProperty("planting_event");
      expect(row).not.toHaveProperty("line");
      expect(row).not.toHaveProperty("created_by");
    }
  });

  it("rejects dangling references before writing", () => {
    expect(() => readHistorySeeds({ ...references, areas: [] })).toThrow("area: missing reference");
    expect(() => readHistorySeeds({ ...references, seasons: [] })).toThrow("season: missing reference");
    expect(() => readHistorySeeds({ ...references, species: [] })).toThrow("species: missing reference");
    expect(() => readHistorySeeds({ ...references, questions: [] })).toThrow("question: missing reference");
  });

  it("rejects duplicate identities and invalid quantities", () => {
    const planting = structuredClone(dump[0]!);
    expect(() => readHistorySeeds(references, [planting, planting])).toThrow("Duplicate planting");
    planting.lines.push(planting.lines[0]!);
    expect(() => readHistorySeeds(references, [planting])).toThrow("Duplicate legacy_code");
    expect(() => readHistorySeeds(references, [{ ...planting, lines: [{ ...planting.lines[0]!, quantity: -1 }] }])).toThrow();
    const withNote = structuredClone(dump.find((event) => event.lines.some((line) => line.notes.length))!);
    const line = withNote.lines.find((row) => row.notes.length)!;
    line.notes.push(line.notes[0]!);
    expect(() => readHistorySeeds(references, [withNote])).toThrow("Duplicate note question");
  });
});
