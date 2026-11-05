import { describe, expect, it } from "vitest";
import { isIsoDate, seasonFromDate, todayInNz } from "@/lib/wrt/events/season";

describe("seasonFromDate", () => {
  it.each([
    ["2026-01-15", "Summer", 2026],
    ["2026-02-28", "Summer", 2026],
    ["2026-03-01", "Autumn", 2026],
    ["2026-05-31", "Autumn", 2026],
    ["2026-06-01", "Winter", 2026],
    ["2026-08-31", "Winter", 2026],
    ["2026-09-01", "Spring", 2026],
    ["2026-11-30", "Spring", 2026],
    ["2026-12-01", "Summer", 2027],
  ])("%s → %s %i", (date, season, year) => {
    expect(seasonFromDate(date)).toEqual({ season, seasonYear: year });
  });

  it("rejects impossible or malformed dates", () => {
    expect(seasonFromDate("2026-02-30")).toBeNull();
    expect(seasonFromDate("10/05/2026")).toBeNull();
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
  });

  it("today is NZ time", () => {
    // 2026-10-31 20:00 UTC is already 1 November in New Zealand (NZDT, UTC+13).
    expect(todayInNz(new Date("2026-10-31T20:00:00Z"))).toBe("2026-11-01");
  });
});
