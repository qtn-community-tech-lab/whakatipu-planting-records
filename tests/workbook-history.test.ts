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
    expect(plantings).toHaveLength(358);
    expect(lines).toHaveLength(5444);
    expect(notes).toHaveLength(1334);
    expect(lines.reduce((total, line) => total + (line.quantity ?? 0), 0)).toBe(140068);
    for (const season of references.seasons) {
      if (season.workbook_total === null) continue;
      const total = plantings
        .filter((planting) => planting.season === season.slug && planting.deactivated_at === null)
        .flatMap((planting) => planting.lines)
        .filter((line) => line.deactivated_at === null)
        .reduce((sum, line) => sum + (line.quantity ?? 0), 0);
      expect(total, season.slug).toBe(season.workbook_total);
    }
    for (const row of [...plantings, ...lines, ...notes]) {
      expect(row).not.toHaveProperty("id");
      expect(row).not.toHaveProperty("planting_event");
      expect(row).not.toHaveProperty("line");
      expect(row).not.toHaveProperty("created_by");
    }
  });

  it("combines duplicate species while retaining source records and confirmed quantities", () => {
    const plantings = readHistorySeeds(references);
    const quailRise = plantings.find((planting) => planting.area === "quail-rise" && planting.season === "spring-2025")!;
    const mingimingi = quailRise.lines.filter((line) => line.species === "leptecophylla-juniperina");
    expect(mingimingi).toHaveLength(1);
    expect(mingimingi[0]).toMatchObject({
      quantity: 19, confidence: "low", source_cell: "OP106, OP50",
    });
    const quantityNote = mingimingi[0]!.notes.find((note) => note.question === "not-a-number")!;
    expect(quantityNote.resolved_at).not.toBeNull();
    expect(quantityNote.deactivated_at).toBeNull();
    expect(quantityNote.text).toContain("OP50 confirmed as 0 plants; OP106 confirmed as 19 plants");
    const sourceNote = mingimingi[0]!.notes.find((note) => note.question === "other")!.text;
    expect(sourceNote).toContain("PH-2025S-OP106");
    expect(sourceNote).toContain("PH-2025S-OP50");
    expect(sourceNote).toContain("unknown (TBC)");

    const welcomeForest = plantings.find((planting) => planting.area === "jardine-park-welcome-forest" && planting.season === "autumn-2026")!;
    for (const [species, quantity, row] of [
      ["carmichaelia-petriei", 15, 16], ["coprosma-propinqua", 25, 29],
      ["cordyline-australis", 13, 35], ["sophora-microphylla", 11, 96],
    ] as const) {
      const matches = welcomeForest.lines.filter((line) => line.species === species);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({ quantity, source_cell: `PG${row}, PP${row}` });
      const provenance = matches[0]!.notes.find((note) => note.question === "other")!;
      expect(provenance.text).toContain(`PH-2026A-PG${row}`);
      expect(provenance.text).toContain(`PH-2026A-PP${row}`);
      expect(matches[0]!.notes.find((note) => note.question === "new-site")!.resolved_at).not.toBeNull();
    }
  });

  it("assigns the final Shotover decisions to 28A and leaves no actionable reviews", () => {
    const plantings = readHistorySeeds(references);
    const area = "tucker-beach-and-shotover-river-shotover-river";
    for (const [season, prefix, count, plants] of [
      ["autumn-2019", "PH-2019A-FP", 5, 40], ["autumn-2021", "PH-2021A-IC", 4, 50],
    ] as const) {
      const event = plantings.find((row) => row.area === area && row.season === season)!;
      const confirmed = event.lines.filter((line) => line.legacy_code.startsWith(prefix));
      expect(confirmed).toHaveLength(count);
      expect(confirmed.reduce((sum, line) => sum + (line.quantity ?? 0), 0)).toBe(plants);
    }
    const autumn2021 = plantings.find((row) => row.area === area && row.season === "autumn-2021")!;
    expect(autumn2021.lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0)).toBe(70);
    expect(autumn2021.lines.find((line) => line.legacy_code === "PH-2021A-ID77")?.quantity).toBe(20);
    const open = plantings.flatMap((event) => event.lines.flatMap((line) => line.notes))
      .filter((note) => note.deactivated_at === null && note.resolved_at === null && note.kind !== "fyi");
    expect(open).toEqual([]);
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
    expect(() => readHistorySeeds(references, [{
      ...planting, lines: [planting.lines[0]!, { ...planting.lines[0]!, legacy_code: "duplicate-species" }],
    }])).toThrow("Duplicate active species");
    planting.lines.push(planting.lines[0]!);
    expect(() => readHistorySeeds(references, [planting])).toThrow("Duplicate legacy_code");
    expect(() => readHistorySeeds(references, [{ ...planting, lines: [{ ...planting.lines[0]!, quantity: -1 }] }])).toThrow();
    const withNote = structuredClone(dump.find((event) => event.lines.some((line) => line.notes.length))!);
    const line = withNote.lines.find((row) => row.notes.length)!;
    line.notes.push(line.notes[0]!);
    expect(() => readHistorySeeds(references, [withNote])).toThrow("Duplicate note question");
  });
});
