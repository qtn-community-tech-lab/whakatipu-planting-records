import { describe, expect, it } from "vitest";
import { cleanLabel, editDistance, foldMacrons, formatNumber, formatShare, matchScore, searchKey, slugify, spanLabel } from "@/lib/wrt/text";
import { first } from "@/lib/wrt/params";

describe("foldMacrons", () => {
  it("removes macrons, both cases", () => {
    expect(foldMacrons("Mānuka")).toBe("Manuka");
    expect(foldMacrons("Kōwhai Tī kōuka")).toBe("Kowhai Ti kouka");
    expect(foldMacrons("ĀĒĪŌŪ āēīōū")).toBe("AEIOU aeiou");
  });
  it("leaves other characters alone", () => {
    expect(foldMacrons("Lake Hayes 2019 – ok")).toBe("Lake Hayes 2019 – ok");
  });
});

describe("searchKey", () => {
  it("lower-cases, folds macrons and collapses punctuation to single spaces", () => {
    expect(searchKey("  Tī   Kōuka!! ")).toBe("ti kouka");
    expect(searchKey("Peace Park & Frankton")).toBe("peace park frankton");
  });
  it("turns a literal backslash-n from the source into a space", () => {
    expect(searchKey("SLOPE\\nHILL")).toBe("slope hill");
  });
  it("strips other diacritics", () => {
    expect(searchKey("Café")).toBe("cafe");
  });
  it("is empty for punctuation only", () => {
    expect(searchKey("--- !!")).toBe("");
  });
});

describe("slugify", () => {
  it("makes URL slugs", () => {
    expect(slugify("Lake Hayes Pavilion")).toBe("lake-hayes-pavilion");
    expect(slugify("Leptospermum scoparium")).toBe("leptospermum-scoparium");
    expect(slugify("Mānuka & Kānuka")).toBe("manuka-kanuka");
  });
  it("never leaves leading or trailing hyphens", () => {
    expect(slugify("  (Paper4Trees) ")).toBe("paper4trees");
  });
});

describe("cleanLabel", () => {
  it("shows a source header with a literal \\n as one line", () => {
    expect(cleanLabel("SLOPE\\nHILL  A")).toBe("SLOPE HILL A");
  });
});

describe("editDistance", () => {
  it("counts a transposition as one edit", () => {
    expect(editDistance("kowhia", "kowhai")).toBe(1);
  });
  it("counts insert, delete and substitute as one edit each", () => {
    expect(editDistance("manuka", "manukka")).toBe(1);
    expect(editDistance("manuka", "manuk")).toBe(1);
    expect(editDistance("manuka", "manika")).toBe(1);
  });
  it("is zero for equal strings", () => {
    expect(editDistance("abc", "abc")).toBe(0);
  });
  it("gives up past the bound with max + 1", () => {
    expect(editDistance("abc", "xyzxyz", 2)).toBe(3);
    expect(editDistance("kitten", "sitting", 1)).toBe(2);
  });
});

describe("matchScore", () => {
  it("ranks exact above prefix above substring above typo", () => {
    const exact = matchScore("manuka", ["manuka"]);
    const prefix = matchScore("manu", ["manuka"]);
    const word = matchScore("hill", ["slope hill"]);
    const sub = matchScore("nuk", ["manuka"]);
    const typo = matchScore("manukka", ["manuka"]);
    expect(exact).toBe(100);
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(sub);
    expect(sub).toBeGreaterThan(typo);
    expect(typo).toBeGreaterThan(0);
  });
  it("ignores spaces as a fallback", () => {
    expect(matchScore("white chapel", ["whitechapel"])).toBe(100);
  });
  it("is zero for no match and for an empty query", () => {
    expect(matchScore("zzzz", ["manuka"])).toBe(0);
    expect(matchScore("", ["manuka"])).toBe(0);
    expect(matchScore("   ", ["manuka"])).toBe(0);
  });
});

describe("formatNumber", () => {
  it("uses en-NZ thousands separators", () => {
    expect(formatNumber(7020)).toBe("7,020");
    expect(formatNumber(140068)).toBe("140,068");
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });
});

describe("formatShare", () => {
  it("rounds to a whole percent", () => {
    expect(formatShare(44290, 140068)).toBe("32%");
    expect(formatShare(667, 5449)).toBe("12%");
  });
  it("says <1% rather than 0%, and never NaN", () => {
    expect(formatShare(1, 1000)).toBe("<1%");
    expect(formatShare(0, 1000)).toBe("0%");
    expect(formatShare(5, 0)).toBe("0%");
  });
});

describe("spanLabel", () => {
  const a = { slug: "autumn-2019", label: "Autumn 2019" };
  const b = { slug: "spring-2024", label: "Spring 2024" };
  it("joins two different seasons with an arrow", () => {
    expect(spanLabel({ first: a, last: b })).toBe("Autumn 2019 → Spring 2024");
  });
  it("names a single season once", () => {
    expect(spanLabel({ first: a, last: a })).toBe("Autumn 2019");
  });
});

describe("first (search params)", () => {
  it("takes the first of a repeated param and passes a single one through", () => {
    expect(first(["2019", "2020"])).toBe("2019");
    expect(first("2019")).toBe("2019");
    expect(first(undefined)).toBeUndefined();
  });
});
