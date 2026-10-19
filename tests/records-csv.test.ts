import { describe, expect, it } from "vitest";
import { csvField, csvFilename, recordsToCsv } from "@/lib/wrt/records-csv";
import { q } from "./helpers";

describe("csvField", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("two\nlines")).toBe('"two\nlines"');
  });
  it("defuses spreadsheet formulas and leaves plain text alone", () => {
    expect(csvField("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvField("+1")).toBe("'+1");
    expect(csvField("Kōwhai")).toBe("Kōwhai");
    expect(csvField(null)).toBe("");
  });
});

describe("recordsToCsv", () => {
  it("starts with a BOM and writes one CRLF line per record plus the header", async () => {
    const { rows } = await q.records({ year: 2019 });
    const csv = recordsToCsv(rows);
    expect(csv.startsWith("\ufeffSeason,Year,Site,")).toBe(true);
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(rows.length + 1);
  });
  it("names the file from the filter", () => {
    expect(csvFilename({ place: "lake-hayes", year: 2019 })).toBe("wrt-recorded-plants-lake-hayes-2019");
    expect(csvFilename({})).toBe("wrt-recorded-plants");
  });
});
