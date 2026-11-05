import { describe, expect, it } from "vitest";
import { eventsToCsv } from "@/lib/wrt/events/events-csv";
import type { EventView } from "@/lib/wrt/events/views";
import { sampleInput } from "./event-store-contract";

const view = (over: Partial<EventView> = {}): EventView => ({
  event: { ...sampleInput({ notes: '=SUM(A1) and "quotes", commas' }), id: "11111111-1111-4111-8111-111111111111", photoUrl: null, createdAt: "2026-05-10T01:00:00.000Z", updatedAt: "2026-05-10T01:00:00.000Z" },
  siteName: "Lake Hayes",
  partName: null,
  seasonLabel: "Autumn 2026",
  dateLabel: "Sun 10 May 2026",
  species: [
    { id: "SP-001", name: "Mānuka", scientific: "Leptospermum scoparium", isScientific: false, quantity: 40 },
    { id: "SP-002", name: "Aciphylla aurea", scientific: "Aciphylla aurea", isScientific: true, quantity: 10 },
  ],
  totalPlants: 50,
  areaM2: 12_345,
  ...over,
});

/** Minimal CSV reader for the test (handles quotes, doubled quotes and commas). */
function parse(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (q) {
      if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\r" && csv[i + 1] === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i++; }
    else cell += c;
  }
  return rows;
}

describe("eventsToCsv", () => {
  const csv = eventsToCsv([view()]);
  const [head, ...rows] = parse(csv.slice(1));
  const col = (name: string) => head.indexOf(name);

  it("starts with a BOM and uses CRLF", () => {
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("writes one line per species, repeating the event columns", () => {
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r[col("Quantity")])).toEqual(["40", "10"]);
    expect(rows.every((r) => r[col("Event total plants")] === "50")).toBe(true);
    expect(rows[0][col("Area (ha)")]).toBe("1.2345");
  });

  it("keeps macrons, blanks the common name for scientific-only species", () => {
    expect(rows[0][col("Species (common name)")]).toBe("Mānuka");
    expect(rows[1][col("Species (common name)")]).toBe("");
    expect(rows[1][col("Botanical name")]).toBe("Aciphylla aurea");
  });

  it("polygon_geojson parses back to the stored polygon", () => {
    expect(JSON.parse(rows[0][col("polygon_geojson")])).toEqual(sampleInput().polygon);
  });

  it("defuses formula-like notes", () => {
    expect(rows[0][col("Notes")].startsWith("'=")).toBe(true);
  });

  it("an empty export is just the header", () => {
    expect(parse(eventsToCsv([]).slice(1))).toHaveLength(1);
  });
});
