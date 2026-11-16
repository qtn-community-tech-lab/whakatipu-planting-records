import { describe, expect, it } from "vitest";
import { exportName, toCsv } from "@/lib/wrt/export/csv";

describe("export CSV text", () => {
  const csv = toCsv(
    ["name", "quantity", "threatened"],
    [
      ["Kōwhai, small", 0, true],
      ['Say "hi"\nnext line', null, false],
      ["=SUM(A1)", undefined, null],
    ],
  );

  it("starts with a BOM and ends every line with CRLF", () => {
    expect(csv.startsWith("﻿name,quantity,threatened\r\n")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("keeps macrons, quotes commas, quotes and line breaks, and defuses formulas", () => {
    expect(csv).toContain('"Kōwhai, small"');
    expect(csv).toContain('"Say ""hi""\nnext line"');
    expect(csv).toContain("'=SUM(A1)");
  });

  it("writes 0 for zero, blank for unknown, and Yes/No for booleans", () => {
    expect(csv).toContain('"Kōwhai, small",0,Yes\r\n');
    expect(csv).toContain('next line",,No\r\n');
    expect(csv).toContain("'=SUM(A1),,\r\n");
  });
});

describe("exportName", () => {
  it("uses the New Zealand date and hyphens", () => {
    // 11:30 UTC on 15 Nov is already 16 Nov in New Zealand.
    expect(exportName("planting_lines", new Date("2026-11-15T11:30:00Z"))).toBe("wrt-planting-lines-2026-11-16");
  });
});
