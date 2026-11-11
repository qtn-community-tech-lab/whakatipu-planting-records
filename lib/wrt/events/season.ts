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
