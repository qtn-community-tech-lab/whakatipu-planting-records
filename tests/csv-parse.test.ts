import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/wrt/csv/parse";

describe("parseCsv", () => {
  it("parses a plain table keyed by header", () => {
    const t = parseCsv("a,b,c\n1,2,3\n4,5,6\n");
    expect(t.header).toEqual(["a", "b", "c"]);
    expect(t.rows).toEqual([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
    expect(t.lines).toEqual([2, 3]);
  });

  it("handles quoted fields with commas", () => {
    const t = parseCsv('name,note\n"Smith, J",hello\n');
    expect(t.rows[0]).toEqual({ name: "Smith, J", note: "hello" });
  });

  it("unescapes doubled quotes", () => {
    const t = parseCsv('a\n"she said ""hi"""\n');
    expect(t.rows[0].a).toBe('she said "hi"');
  });

  it("keeps newlines inside quotes and counts source lines correctly", () => {
    const t = parseCsv('a,b\n"line one\nline two",x\ny,z\n');
    expect(t.rows).toHaveLength(2);
    expect(t.rows[0].a).toBe("line one\nline two");
    // Row 1 starts on line 2; the quoted newline pushes the next row to line 4.
    expect(t.lines).toEqual([2, 4]);
  });

  it("accepts CRLF line endings", () => {
    const t = parseCsv("a,b\r\n1,2\r\n3,4\r\n");
    expect(t.rows).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("accepts a lone CR as a line ending", () => {
    expect(parseCsv("a,b\r1,2\r").rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("strips a UTF-8 BOM so the first header is clean", () => {
    const t = parseCsv("﻿record_id,year\nPH-1,2015\n");
    expect(t.header[0]).toBe("record_id");
    expect(t.rows[0].record_id).toBe("PH-1");
  });

  it("drops trailing rows that are entirely empty fields (spreadsheet export padding)", () => {
    expect(parseCsv("a,b\n1,2\n,\n,\n").rows).toHaveLength(1);
  });

  it("ignores trailing blank lines", () => {
    const t = parseCsv("a,b\n1,2\n\n\n");
    expect(t.rows).toHaveLength(1);
  });

  it("works without a final newline", () => {
    expect(parseCsv("a,b\n1,2").rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("returns an empty table for empty input", () => {
    expect(parseCsv("")).toEqual({ header: [], rows: [], lines: [] });
  });

  it("keeps empty fields as empty strings", () => {
    const t = parseCsv("a,b,c\n1,,3\n,,\n4,5,6\n");
    expect(t.rows[0]).toEqual({ a: "1", b: "", c: "3" });
    expect(t.rows[1]).toEqual({ a: "", b: "", c: "" });
  });

  it("flags ragged rows instead of silently dropping them", () => {
    const t = parseCsv("a,b,c\n1,2\n1,2,3,4\n");
    expect(t.rows).toHaveLength(2);
    expect(t.rows[0].__fieldCount).toBe("2");
    expect(t.rows[0].c).toBe(""); // missing field padded
    expect(t.rows[1].__fieldCount).toBe("4");
    expect(t.rows[1].c).toBe("3");
  });

  it("does not flag rows with the right field count", () => {
    expect(parseCsv("a,b\n1,2\n").rows[0].__fieldCount).toBeUndefined();
  });

  it("throws on an unterminated quote", () => {
    expect(() => parseCsv('a,b\n"oops,2\n')).toThrow(/Unterminated/);
  });

  it("trims header names but not values", () => {
    const t = parseCsv(" a , b \n x , y \n");
    expect(t.header).toEqual(["a", "b"]);
    expect(t.rows[0]).toEqual({ a: " x ", b: " y " });
  });

  it("keeps a quoted empty string as a field", () => {
    expect(parseCsv('a,b\n"",x\n').rows[0]).toEqual({ a: "", b: "x" });
  });
});
