/**
 * Text helpers shared by the data layer and search.
 * Search ignores macrons and case; display never drops macrons.
 */

const MACRON_MAP: Record<string, string> = {
  ā: "a", ē: "e", ī: "i", ō: "o", ū: "u",
  Ā: "A", Ē: "E", Ī: "I", Ō: "O", Ū: "U",
};

/** "Mānuka" → "Manuka". */
export function foldMacrons(s: string): string {
  return s.replace(/[āēīōūĀĒĪŌŪ]/g, (c) => MACRON_MAP[c] ?? c);
}

/** Lower-case, macron-free, punctuation collapsed to single spaces. */
export function searchKey(s: string): string {
  return foldMacrons(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\\n/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** URL slug: "Lake Hayes Pavilion" → "lake-hayes-pavilion". */
/** Trust boundary: a slug that came from the browser. */
export const SLUG = /^[a-z0-9-]{1,80}$/;

export function slugify(s: string): string {
  return searchKey(s).replace(/\s+/g, "-");
}

/** Source headers sometimes carry a literal "\n"; show them as one line. */
export function cleanLabel(s: string): string {
  return s.replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Bounded optimal-string-alignment distance (Levenshtein + adjacent
 * transposition, so "kowhia" is 1 from "kowhai"). Returns max+1 once exceeded.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  let beforePrevious: number[] = [];
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min((previous[j] ?? Infinity) + 1, (row[j - 1] ?? Infinity) + 1, (previous[j - 1] ?? Infinity) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, (beforePrevious[j - 2] ?? Infinity) + 1);
      }
      row[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    beforePrevious = previous;
    previous = row;
  }
  return previous[b.length] ?? max + 1;
}

function typoTolerance(len: number): number {
  return len >= 8 ? 2 : len >= 4 ? 1 : 0;
}

// ponytail: tiny list; add a pair when staff hit another look-alike name
const LOOK_ALIKES = new Set(["kanuka|manuka", "manuka|kanuka"]);
const lookAlike = (a: string, b: string) => LOOK_ALIKES.has(`${a}|${b}`);

function wordMatches(qw: string, kw: string): boolean {
  if (kw.startsWith(qw)) return true;
  if (lookAlike(qw, kw)) return false;
  const tol = typoTolerance(qw.length);
  if (!tol) return false;
  return editDistance(qw, kw, tol) <= tol || editDistance(qw, kw.slice(0, qw.length), tol) <= tol;
}

/**
 * Score how well a query matches a set of search keys. 0 = no match.
 * Exact > prefix > word prefix > substring > typo-tolerant match.
 * Spaces are ignored as a fallback, so "white chapel" finds "whitechapel".
 */
export function matchScore(query: string, keys: string[]): number {
  const q = searchKey(query);
  if (!q) return 0;
  const qc = q.replace(/ /g, "");
  const qWords = q.split(" ");
  let best = 0;
  for (const key of keys) {
    if (!key) continue;
    const kc = key.replace(/ /g, "");
    if (key === q || kc === qc) return 100;
    if (key.startsWith(q) || kc.startsWith(qc)) best = Math.max(best, 80);
    else if (key.split(" ").some((w) => w.startsWith(q))) best = Math.max(best, 70);
    else if (key.includes(q) || (qc.length >= 3 && kc.includes(qc))) best = Math.max(best, 55);
    else {
      const kWords = key.split(" ");
      if (qWords.every((qw) => kWords.some((kw) => wordMatches(qw, kw)))) best = Math.max(best, 35);
      else {
        const tol = typoTolerance(qc.length);
        if (tol && !lookAlike(qc, kc.slice(0, qc.length)) && editDistance(qc, kc.slice(0, qc.length + 1), tol) <= tol) {
          best = Math.max(best, 30);
        }
      }
    }
  }
  return best;
}

/**
 * Items matching a query, best match first (ties by name). With nothing typed,
 * the whole list in its given order. Used by the form's searchable choosers.
 */
export function rankMatches<T extends { name: string; keys: string[] }>(items: readonly T[], query: string): T[] {
  const q = query.trim();
  if (!q) return [...items];
  return items
    .map((item) => ({ item, score: matchScore(q, item.keys) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map((r) => r.item);
}

/** en-NZ number formatting: 7,020. */
/** "Autumn 2019 → Spring 2024", or just the one season when first and last are the same. */
export function spanLabel(span: { first: { slug: string; label: string }; last: { slug: string; label: string } }): string {
  return span.first.slug === span.last.slug ? span.first.label : `${span.first.label} → ${span.last.label}`;
}

/**
 * A part's name for showing beside its site's name: without the site in front
 * ("Arthurs Point - Morning Star Reserve" at Arthurs Point reads "Morning Star Reserve").
 */
export function partBesideSite(part: string, site: string): string {
  const rest = part.startsWith(site) ? part.slice(site.length).replace(/^\s*[-–—:/]\s*/, "") : part;
  return rest && rest.length < part.length - site.length ? rest : part;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-NZ").format(n);
}

/** "12%" style share, never "NaN%". */
export function formatShare(part: number, whole: number): string {
  if (!whole) return "0%";
  const pct = (part / whole) * 100;
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}
