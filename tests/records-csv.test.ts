import { describe, expect, it } from "vitest";
import { csvField } from "@/lib/wrt/export/csv";

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
