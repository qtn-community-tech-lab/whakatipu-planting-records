import { defined } from "./assertions";
import { describe, expect, it } from "vitest";
import { parseReviewNotes, reviewTheme } from "@/scripts/workbook/load";

describe("reviewTheme", () => {
  it.each([
    ["species contested (C3) with SP-015: separate stock lines or one? ID kept as typed, no merge", "contested-species"],
    ["Paper4Trees is an order scheme, not a place; WRT to rule how scheme columns count", "order-scheme"],
    ["decision 4: are the two 2024 Slope Hill columns real plantings? (29,000 plants, 21% of all-time total)", "slope-hill-2024"],
    ["row-5 ID 11 vs register 23B: Welcome Forest carries Slope Hill's ID (11)", "site-number-mismatch"],
    ["row-5 ID !!A vs register 11A: ID typed as an error text (!!A)", "site-number-mismatch"],
    ["new or unclear site with no WRT site number: Community partner", "new-site"],
    ["header carried appended personal text; stripped to the site stem; parcel from the row-5 ID", "header-cleaned"],
    ["cell holds text 'TBC'", "not-a-number"],
    ["site identity uncertain: MASTER header 1 MILE - QTMBC has no site ID", "site-identity"],
    ["Shotover River has two parcels (28A and 28B); row-5 ID does not say which", "site-identity"],
    ["header not in the variants table (withheld, may carry a personal name)", "site-identity"],
    ["something nobody anticipated", "other"],
  ])("%s → %s", (text, theme) => {
    expect(reviewTheme(text)).toBe(theme);
  });

  it("is case-insensitive", () => {
    expect(reviewTheme("PAPER4TREES IS AN ORDER SCHEME")).toBe("order-scheme");
  });
});

describe("parseReviewNotes", () => {
  it("returns no notes for an empty reason", () => {
    expect(parseReviewNotes("")).toMatchObject([]);
  });

  it("parses a single ruling (Paper4Trees)", () => {
    const n = parseReviewNotes("RULING: Paper4Trees is an order scheme, not a place; WRT to rule how scheme columns count");
    expect(n).toHaveLength(1);
    expect(defined(n[0]).kind).toBe("ruling");
    expect(defined(n[0]).theme).toBe("order-scheme");
    // The untagged "WRT to rule…" clause continues the note, it is not a new one.
    expect(defined(n[0]).text).toBe("Paper4Trees is an order scheme, not a place; WRT to rule how scheme columns count");
  });

  it("parses a contested species ruling", () => {
    const n = parseReviewNotes("RULING: species contested (C5) with SP-122 SP-121: separate stock lines or one? ID kept as typed, no merge");
    expect(n).toMatchObject([
      { kind: "ruling", theme: "contested-species", text: "species contested (C5) with SP-122 SP-121: separate stock lines or one? ID kept as typed, no merge" },
    ]);
  });

  it("parses a confirmation with a row-5 ID mismatch", () => {
    const n = parseReviewNotes("CONFIRM: row-5 ID 11 vs register 23B: Welcome Forest carries Slope Hill's ID (11)");
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({ kind: "confirm", theme: "site-number-mismatch" });
  });

  it("gives FYI notes the 'other' theme so they never raise a flag on their own", () => {
    const n = parseReviewNotes("FYI: row-5 site ID blank in source; site mapped by header text");
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({ kind: "fyi", theme: "other" });
    // "site mapped by header text" is a continuation clause of the FYI note.
    expect(defined(n[0]).text).toBe("row-5 site ID blank in source; site mapped by header text");
  });

  it("splits decision 4 from its FYI siblings", () => {
    const n = parseReviewNotes(
      "RULING: decision 4: are the two 2024 Slope Hill columns real plantings? (29,000 plants, 21% of all-time total); FYI: row-5 site ID blank in source; site mapped by header text; FYI: provisional ID: the Sites master will issue the real one",
    );
    expect(n.map((x) => x.kind)).toMatchObject(["ruling", "fyi", "fyi"]);
    expect(defined(n[0]).theme).toBe("slope-hill-2024");
    expect(defined(n[0]).text).toContain("29,000 plants, 21% of all-time total");
    expect(defined(n[2]).text).toBe("provisional ID: the Sites master will issue the real one");
  });

  it("keeps a continuation clause with the note that precedes it", () => {
    const n = parseReviewNotes(
      "RULING: new or unclear site with no WRT site number: Appears as a column, a site-tab title, and as a nursery supplier header (A26 J4); meaning unclear; FYI: provisional ID: the Sites master will issue the real one",
    );
    expect(n).toHaveLength(2);
    expect(defined(n[0]).theme).toBe("new-site");
    expect(defined(n[0]).text.endsWith("(A26 J4); meaning unclear")).toBe(true);
    expect(defined(n[1]).kind).toBe("fyi");
  });

  it("handles two rulings on one record (scheme + contested species)", () => {
    const n = parseReviewNotes(
      "RULING: Paper4Trees is an order scheme, not a place; WRT to rule how scheme columns count; RULING: species contested (C2) with SP-086: separate stock lines or one? ID kept as typed, no merge",
    );
    expect(n.map((x) => x.theme)).toMatchObject(["order-scheme", "contested-species"]);
  });

  it("handles a ruling followed by a confirmation (two parcels + stripped header)", () => {
    const n = parseReviewNotes(
      "RULING: Shotover River has two parcels (28A and 28B); row-5 ID does not say which; CONFIRM: header carried appended personal text; stripped to the site stem; parcel from the row-5 ID",
    );
    expect(n.map((x) => [x.kind, x.theme])).toMatchObject([
      ["ruling", "site-identity"],
      ["confirm", "header-cleaned"],
    ]);
    expect(defined(n[1]).text).toContain("stripped to the site stem; parcel from the row-5 ID");
  });

  it("treats untagged text as a ruling rather than losing it", () => {
    const n = parseReviewNotes("something odd happened");
    expect(n).toMatchObject([{ kind: "ruling", theme: "other", text: "something odd happened" }]);
  });

  it("parses an old-site-number FYI", () => {
    const n = parseReviewNotes("FYI: Autumn 2015 old site number 3 = 12A in the register");
    expect(n).toMatchObject([{ kind: "fyi", theme: "other", text: "Autumn 2015 old site number 3 = 12A in the register" }]);
  });
});

describe("humaniseNote (display text never exposes join keys)", () => {
  it("replaces species IDs with names and drops cluster codes", async () => {
    const { humaniseNote } = await import("@/scripts/workbook/load");
    const names: Record<string, string> = { "SP-122": "Ozothamnus leptophyllus", "SP-121": "Ozothamnus fulvida" };
    const out = humaniseNote(
      "species contested (C5) with SP-122 SP-121: separate stock lines or one? ID kept as typed, no merge",
      (id) => names[id],
    );
    expect(out).toBe("species contested with Ozothamnus leptophyllus and Ozothamnus fulvida: one species or two? Kept as typed; the numbers are not merged");
  });

  it("no record note shown to users contains a species ID, but the raw note is kept", async () => {
    const { repo } = await import("./helpers");
    const recs = await repo.listRecords();
    const notes = recs.flatMap((r) => r.notes);
    expect(notes.some((n) => /SP-\d+/.test(n.raw))).toBe(true);
    expect(notes.filter((n) => /SP-\d+|\(C\d+\)/.test(n.text))).toEqual([]);
  });
});
