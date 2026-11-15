/**
 * Suggest a season from a planting date. The form pre-fills this; the user
 * can always change it (a late-May planting may still be "Autumn" to WRT).
 *
 * Southern-hemisphere meteorological seasons:
 *   Dec–Feb Summer · Mar–May Autumn · Jun–Aug Winter · Sep–Nov Spring
 *
 * Summer straddles New Year, so December counts toward the FOLLOWING year's
 * Summer (December 2026 → Summer 2027). That keeps one summer under one label.
 *
 * ponytail: this convention is an assumption — confirm with WRT. It only
 * affects the suggestion; stored events keep whatever the user chose.
 */
import type { EventSeason } from "./types";

const BY_MONTH: readonly EventSeason[] = [
  "Summer", "Summer", "Autumn", "Autumn", "Autumn", "Winter",
  "Winter", "Winter", "Spring", "Spring", "Spring", "Summer",
];

/** True for a real calendar day written "YYYY-MM-DD" (rejects 2026-02-30). */
export function isIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** "2026-12-03" → { season: "Summer", seasonYear: 2027 }. Null for anything that is not a real date. */
export function seasonFromDate(isoDate: string): { season: EventSeason; seasonYear: number } | null {
  if (!isIsoDate(isoDate)) return null;
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const season = BY_MONTH[month - 1];
  if (!season) return null;
  return { season, seasonYear: month === 12 ? year + 1 : year };
}

/** "2026-10-07" → "Wed 7 Oct 2026" (Canopy's date style). */
export function formatPlantedOn(isoDate: string): string {
  const y = Number(isoDate.slice(0, 4));
  const m = Number(isoDate.slice(5, 7));
  const d = Number(isoDate.slice(8, 10));
  const date = new Date(Date.UTC(y, m - 1, d));
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NZ", { timeZone: "UTC", ...o }).format(date);
  return `${part({ weekday: "short" })} ${d} ${part({ month: "short" })} ${y}`;
}

/** Today's date in New Zealand as "YYYY-MM-DD": the form's default and the "not in the future" limit. */
export function todayInNz(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(now);
}

/** Each season's middle month (1–12); Summer's is January of its year. */
const MIDDLE: Record<string, number> = { summer: 1, autumn: 4, winter: 7, spring: 10 };

/**
 * How long ago a season was, from its middle to today: "autumn-2026" on "2026-11-11" → "7 months ago".
 * Over a year it rounds to the half year ("1½ years ago"); the season you're in is "This season", a later one "Upcoming".
 * Undefined for a slug that isn't "<season>-<year>".
 */
export function seasonAgo(slug: string, today: string): string | undefined {
  const m = /^(summer|autumn|winter|spring)-(\d{4})$/.exec(slug);
  if (!m) return undefined;
  const months = (Number(today.slice(0, 4)) - Number(m[2])) * 12 + Number(today.slice(5, 7)) - MIDDLE[m[1]!]!;
  if (months < -1) return "Upcoming";
  if (months < 2) return "This season";
  if (months < 12) return `${months} months ago`;
  const halves = Math.round(months / 6);
  const years = `${Math.floor(halves / 2) || ""}${halves % 2 ? "½" : ""}`;
  return `${years} ${halves === 2 ? "year" : "years"} ago`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * A season's months, by BY_MONTH above: "autumn-2021" → "March to May 2021", and Summer starts the
 * December before ("summer-2027" → "December 2026 to February 2027"). Undefined for a slug that isn't "<season>-<year>".
 */
export function seasonMonths(slug: string): string | undefined {
  const m = /^(summer|autumn|winter|spring)-(\d{4})$/.exec(slug);
  if (!m) return undefined;
  const year = Number(m[2]);
  // Its middle month (January for Summer), and the months either side.
  const first = MIDDLE[m[1]!]! - 2; // 0-based; -1 is the December before
  const last = first + 2;
  return first < 0 ? `December ${year - 1} to ${MONTHS[last]} ${year}` : `${MONTHS[first]} to ${MONTHS[last]} ${year}`;
}

/**
 * What's wrong with a planting date for an event in a season ("autumn-2021"): in the future, or outside
 * the season. Undefined when it's fine. The edit form and its server action both check with it.
 */
export function plantedOnProblem(date: string, season: string, today: string): string | undefined {
  if (date > today) return "The planting date can't be in the future.";
  const at = seasonFromDate(date);
  if (at && `${at.season.toLowerCase()}-${at.seasonYear}` === season) return undefined;
  const [name = "", year = ""] = season.split("-");
  return `The date has to be in ${name.charAt(0).toUpperCase()}${name.slice(1)} ${year} (${seasonMonths(season) ?? "that season"}).`;
}

/** A season's first and last days, "YYYY-MM-DD": "autumn-2021" → 2021-03-01 to 2021-05-31. Undefined for a bad slug. */
export function seasonDates(slug: string): { first: string; last: string } | undefined {
  const m = /^(summer|autumn|winter|spring)-(\d{4})$/.exec(slug);
  if (!m) return undefined;
  const middle = MIDDLE[m[1]!]! - 1; // 0-based, so Summer's first month (-1) is the December before
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { first: iso(new Date(Date.UTC(Number(m[2]), middle - 1, 1))), last: iso(new Date(Date.UTC(Number(m[2]), middle + 2, 0))) };
}
