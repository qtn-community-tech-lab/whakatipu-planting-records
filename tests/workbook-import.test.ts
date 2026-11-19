import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadFromDirectory } from "@/scripts/workbook/load";
import { REQUIRED_COLUMNS, type SourceName } from "@/scripts/workbook/validate";
import { readSpeciesSeed } from "@/scripts/species/seed";

const directories: string[] = [];
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true }); });

function workbook(speciesId = "SP-124") {
  const dir = mkdtempSync(path.join(tmpdir(), "wrt-workbook-import-"));
  directories.push(dir);
  function table(name: SourceName, row: Record<string, string>) {
    const columns = REQUIRED_COLUMNS[name];
    writeFileSync(path.join(dir, `${name}.csv`), `${columns.join(",")}\n${columns.map((column) => row[column] ?? "").join(",")}\n`);
  }
  table("planting_history", {
    record_id: "PH-TEST", year: "2026", season: "Autumn", season_label_original: "Autumn 2026",
    site_original: "Test reserve", site_id_proposed: "TEST-1", site_group_proposed: "Test reserve",
    site_class: "C", species_original: "Parsonia heterophylla", species_id_proposed: speciesId,
    species_canonical: "Parsonia heterophylla", quantity: "7", precision: "site", confidence: "high",
    needs_review: "Y", review_reason: `CONFIRM: Species contested ${speciesId}`,
    source_file: "Original workbook.xlsx", source_sheet: "MASTER", source_cell: "B12",
  });
  table("site_crosswalk", {
    site_original: "Test reserve", site_id_proposed: "TEST-1", site_name_proposed: "Test reserve",
    site_group: "Test reserve", class: "C", precision: "site",
  });
  table("history_reconciliation", {
    item: "season", label: "Autumn 2026", generated: "7", stated: "7", difference: "0",
    stated_cell: "MASTER!B20", records: "1", cause: "",
  });
  return dir;
}

describe("workbook import species source", () => {
  it("loads complete JSON species without either species CSV or separate reference files", () => {
    const data = loadFromDirectory(workbook());
    expect(data.species).toEqual(readSpeciesSeed());
    expect(data.species.find((entry) => entry.register_code === "SP-050")?.photos.length).toBeGreaterThan(0);
    expect(data.records).toMatchObject([{
      id: "PH-TEST", speciesId: "SP-124", quantity: 7,
      notes: [{ text: "Species contested Parsonsia heterophylla" }],
      provenance: { speciesOriginal: "Parsonia heterophylla", sourceCell: "B12" },
    }]);
    expect(data.reconciliation).toMatchObject([{ generated: 7, stated: 7, difference: 0 }]);
  });

  it("rejects history referencing a species missing from the JSON seed", () => {
    expect(() => loadFromDirectory(workbook("SP-999"))).toThrow("species SP-999 not in data/species.json");
  });
});
