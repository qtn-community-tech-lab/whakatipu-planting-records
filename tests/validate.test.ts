import { describe, expect, it } from "vitest";
import { checkColumns, REQUIRED_COLUMNS, toSiteClass, validateHistoryRow, yn } from "@/lib/wrt/csv/validate";
import { parseCsv } from "@/lib/wrt/csv/parse";
import type { DataIssue } from "@/lib/wrt/csv/types";

function row(over: Record<string, string> = {}): Record<string, string> {
  return {
    record_id: "PH-2019A-FK12", year: "2019", season: "Autumn", season_label_original: "AUTUMN 2019",
    site_original: "WHITECHAPEL", site_id_proposed: "7", site_group_proposed: "Whitechapel", site_class: "K",
    species_original: "Leptospermum scoparium", species_id_proposed: "SP-042", species_canonical: "Leptospermum scoparium",
    quantity: "25", precision: "site", confidence: "high", needs_review: "N", review_reason: "",
    source_file: "x.xlsx", source_sheet: "MASTER", source_cell: "FK12",
    ...over,
  };
}

function run(over: Record<string, string> = {}) {
  const issues: DataIssue[] = [];
  const result = validateHistoryRow(row(over), 7, issues);
  return { result, issues };
}

describe("validateHistoryRow", () => {
  it("accepts a clean row", () => {
    const { result, issues } = run();
    expect(issues).toEqual([]);
    expect(result).toMatchObject({ recordId: "PH-2019A-FK12", year: 2019, season: "Autumn", quantity: 25, needsReview: false, confidence: "high" });
  });

  it.each([
    ["year", { year: "nineteen" }, /bad year/],
    ["year out of range (low)", { year: "1999" }, /bad year/],
    ["year out of range (high)", { year: "2101" }, /bad year/],
    ["fractional year", { year: "2019.5" }, /bad year/],
    ["season", { season: "Winter" }, /bad season/],
    ["season case", { season: "autumn" }, /bad season/],
    ["negative quantity", { quantity: "-3" }, /bad quantity/],
    ["text quantity", { quantity: "TBC" }, /bad quantity/],
    ["confidence", { confidence: "certain" }, /bad confidence/],
    ["empty confidence", { confidence: "" }, /bad confidence/],
    ["needs_review", { needs_review: "maybe" }, /bad needs_review/],
    ["missing record id", { record_id: "" }, /missing record_id/],
    ["missing species", { species_id_proposed: "" }, /missing species_id_proposed/],
    ["missing place", { site_group_proposed: "" }, /missing site_group_proposed/],
  ])("rejects a bad %s with an error", (_name, over, message) => {
    const { result, issues } = run(over);
    expect(result).toBeNull();
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toMatch(message);
    expect(issues[0].line).toBe(7);
  });

  it("allows a blank quantity only when the row needs review", () => {
    const bad = run({ quantity: "", needs_review: "N" });
    expect(bad.result).toBeNull();
    expect(bad.issues[0].message).toMatch(/blank quantity/);

    const ok = run({ quantity: "", needs_review: "Y", review_reason: "RULING: species contested (C1) with SP-060: x" });
    expect(ok.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(ok.result?.quantity).toBeNull();
    expect(ok.result?.needsReview).toBe(true);
  });

  it("accepts a zero quantity", () => {
    expect(run({ quantity: "0" }).result?.quantity).toBe(0);
  });

  it("warns, but keeps the row, for a fractional quantity", () => {
    const { result, issues } = run({ quantity: "2.5" });
    expect(result?.quantity).toBe(2.5);
    expect(issues.map((i) => i.severity)).toEqual(["warning"]);
  });

  it("warns when a flagged row has no reason", () => {
    const { result, issues } = run({ needs_review: "Y", review_reason: "" });
    expect(result?.needsReview).toBe(true);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
  });

  it("falls back to precision 'unknown' with a warning for an unrecognised precision", () => {
    const { result, issues } = run({ precision: "pixel" });
    expect(result?.precision).toBe("unknown");
    expect(issues[0].severity).toBe("warning");
  });

  it("does not warn for a literal 'unknown' precision", () => {
    const { result, issues } = run({ precision: "unknown" });
    expect(result?.precision).toBe("unknown");
    expect(issues).toEqual([]);
  });

  it("names the record in the message so an issue can be traced", () => {
    expect(run({ year: "x" }).issues[0].message).toContain("PH-2019A-FK12");
  });

  it("maps site class letters", () => {
    expect(toSiteClass("K")).toBe("keystone");
    expect(toSiteClass(" c ")).toBe("community");
    expect(toSiteClass("S")).toBe("school");
    expect(toSiteClass("")).toBe("unknown");
    expect(toSiteClass("Z")).toBe("unknown");
  });

  it("reads Y/N flags", () => {
    expect(yn("Y")).toBe(true);
    expect(yn("N")).toBe(false);
    expect(yn("")).toBeNull();
    expect(yn(undefined)).toBeNull();
  });
});

describe("checkColumns", () => {
  it("reports missing columns as an error", () => {
    const issues: DataIssue[] = [];
    const ok = checkColumns("species_crosswalk", parseCsv("species_id,raw_name\nSP-1,x\n"), issues);
    expect(ok).toBe(false);
    expect(issues[0].message).toMatch(/Missing columns: match_key/);
    expect(issues[0].severity).toBe("error");
  });

  it("warns about ragged rows with their source line", () => {
    const issues: DataIssue[] = [];
    const header = REQUIRED_COLUMNS.species_crosswalk.join(",");
    const ok = checkColumns("species_crosswalk", parseCsv(`${header}\nSP-1,x\n`), issues);
    expect(ok).toBe(true);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", line: 2 });
  });
});
