/**
 * The WRT data chat: system prompt and every tool the model can call.
 *
 * Each tool wraps a query that already exists in lib/wrt/queries.ts, so the
 * chat and the pages always give the same numbers. Each result is drawn by
 * the matching card in components/wrt/ask/chat-cards.tsx.
 *
 * Lives here, not in the route, because Next route files may only export
 * handlers, and the cards need the ChatMessage type below.
 */
import "server-only";
import { tool, type InferUITools, type LanguageModelUsage, type UIMessage } from "ai";
import { z } from "zod";
import { speciesBySite, emptySplit, groupSplits, type RecordFilter, type RecordView } from "@/lib/wrt/queries";
import { getWrt } from "@/lib/wrt/server";
import { matchScore, searchKey } from "@/lib/wrt/text";

import type { PlantingRecord, QuantitySplit, SeasonName } from "@/lib/wrt/types";

export const SYSTEM = `You answer questions about the Wakatipu Reforestation Trust planting history, straight from the data.
- Every number comes from a tool. Never estimate, add or subtract figures yourself. Call counts "recorded".
- Answer plainly in one or two sentences and name at most three items. The cards under your reply show the rest.
- Never ask the user to confirm or choose. Take the most likely reading of the question and answer it.
- Don't add caveats about the data: the page banner and the About the data page explain it. Only when a figure is marked "mostly unconfirmed", add those two words after it.
- Tools take site, species, part and season names or slugs, so call them directly. Use search only when unsure what a name refers to. If nothing matches, say so in a few words; if a tool returns choices, name the closest ones.
- Some sites have parts within them. For a part, call records with the part's name as place (place shows the whole site).
- records can narrow to tall trees (trait over5m), species WRT marks threatened (trait threatened: the "T" in the Plants Out Master; no file records which threat list or year it follows, so always say "marked threatened by WRT", never "threatened species", and mention the basis is unconfirmed) and keystone, community or school sites (siteClass).
- Seasons are the dates: every record has a season (Autumn or Spring, and a year) but no day or month. Quote firstSeason and lastSeason exactly as given; Autumn comes before Spring in a year. For "when", call records with groupBy season and the same place, part and species as the last answer.
- For "last year" and "latest", call records grouped by season to find the last seasons in the data. Never assume a fixed date range or that a season is missing.
- When asked to show or see something, call a tool so a card appears, even if an earlier answer had the numbers.
- "Most likely to see" means the most recorded species there: call records grouped by species.
- "Top 3 plants" or one plant "with its profile": call records for the place, then species for each plant asked for (at most three), passing the same place and part.
- "Parts of" or "sub-sections of" a site: call place.
- The data has no survival, stock, seed origin, funders, volunteers or reasons; if asked, say so in a few words.
- Never show ids such as SP-012 or site numbers.
- Write plain text: no markdown, asterisks or lists. Write the reply once, after your last tool call.`;

const name = (what: string) => z.string().describe(`${what} name or slug as recorded in the data`);

// ---- What the model reads. Tools return everything the cards draw; the model gets a short brief
// (toModelOutput), and so does the history on every later question (convertToModelMessages with tools).

/** "16794", or "35 (mostly unconfirmed)" when more than half still needs a WRT ruling. The cards show the exact split. */
const n = (s: QuantitySplit) => (s.needsReview * 2 > s.total ? `${s.total} (mostly unconfirmed)` : `${s.total}`);
/** "Lake Hayes [lake-hayes] 16794": a name with the slug to call tools with. */
const named = (x: { name?: string; displayName?: string; slug: string }, s: QuantitySplit) => `${x.displayName ?? x.name} [${x.slug}] ${n(s)}`;
const TRAITS = { over5m: "Over 5 m", threatened: "Marked threatened by WRT (basis unconfirmed)" } as const;
const brief = (value: unknown) => ({ type: "text" as const, value: JSON.stringify(value) });

/**
 * Search keys, aliases, notes and per-year rows are for the server and the full pages; the chat cards never read
 * them. Dropping them makes each answer the browser holds, and sends back with every question, about half the size.
 */
const DROP = new Set(["searchKeys", "aliases", "note", "suggestedSpelling", "contestedWith", "commonName", "maoriName", "siteClasses", "years"]);
const lean = <T>(x: T): T => JSON.parse(JSON.stringify(x, (k, v) => (DROP.has(k) ? undefined : v)));

/** Detail results carry every record. The model and the card only need the summary. */
function slim<T extends { records: unknown[] }>(detail: T | null) {
  if (!detail) return { found: false as const };
  const { records, ...summary } = detail;
  return { found: true as const, ...summary, recordCount: records.length };
}

/** One site, as the place tool and the chat sidebar both show it. */
export async function placeDetail(slug: string) {
  const detail = await getWrt().place(slug);
  if (!detail) return { found: false as const };
  // Parts of the site with their top species, built the same way as the site page.
  const parts = detail.parcels.map((p) => {
    const species = [...speciesBySite(detail.records.filter((r) => r.record.parcelId === p.item.id)).values()][0]?.species ?? [];
    return { name: p.item.name, split: p.split, span: p.span, speciesCount: species.length, species: species.slice(0, 3) };
  });
  return lean({ ...slim(detail), parts });
}

/** One species with up to three photos, as the species tool and the chat sidebar both show it. */
export async function speciesDetail(slug: string) {
  const detail = await getWrt().species(slug);
  if (!detail) return { found: false as const };
  const rank = (await getWrt().speciesList()).findIndex((s) => s.item.slug === slug) + 1;
  return {
    ...slim(detail),
    rank,
    photos: detail.species.photos.slice(0, 3),
    profile: detail.species.profile ?? null,
  };
}

/** So "Gorge Road Wetlands" finds the part named "Gorge Rd Wetlands". */
const roads = (s: string) => s.toLowerCase().replace(/\broad\b/g, "rd").replace(/\bstreet\b/g, "st");

/** A part's id within its site, found by name ("Gorge Rd Wetlands"). */
async function parcelId(place: string, part: string) {
  const site = (await getWrt().lookups()).places.find((p) => p.slug === place);
  return site?.parcels.find((c) => roads(searchKey(c.name)) === roads(searchKey(part)))?.id;
}

/** Parts of sites whose names match q ("Gorge Road Wetlands" → Gorge Rd Wetlands in Gorge Road area), best first. */
async function partMatches(q: string) {
  return (await getWrt().lookups()).places
    .flatMap((p) => p.parcels.map((c) => ({
      place: p.slug, placeName: p.name, part: c.name,
      score: matchScore(roads(q), [c.name, ...c.aliases].map((k) => roads(searchKey(k)))),
    })))
    .filter((x) => x.score >= 55 && x.part !== x.placeName)
    .sort((a, b) => b.score - a.score);
}

/** A site from a slug or a name, so the model can skip search. A part's name gives its site and the part. */
async function resolvePlace(v: string): Promise<{ slug: string; part?: string } | null> {
  const wrt = getWrt();
  if ((await wrt.lookups()).places.some((p) => p.slug === v)) return { slug: v };
  const [site] = (await wrt.search(v, 1)).places;
  const [part] = await partMatches(v);
  if (site && searchKey(site.item.name) === searchKey(v)) return { slug: site.item.slug };
  if (part && part.score >= 80) return { slug: part.place, part: part.part };
  return site ? { slug: site.item.slug } : part ? { slug: part.place, part: part.part } : null;
}

/** A species from a slug or a name. When several match and none exactly, the choices go back to the model. */
async function resolveSpecies(v: string) {
  const wrt = getWrt();
  if ((await wrt.speciesList()).some((s) => s.item.slug === v)) return { slug: v };
  const { species } = await wrt.search(v, 5);
  const exact = species.find((s) => [s.item.displayName, s.item.scientificName].some((x) => searchKey(x) === searchKey(v)));
  const single = species.length === 1 ? species[0] : undefined;
  const match = exact ?? single;
  if (match) return { slug: match.item.slug };
  return species.length ? { choices: species.map((s) => ({ slug: s.item.slug, name: s.item.displayName, scientific: s.item.scientificName })) } : null;
}

/**
 * A species, plus how many were recorded at one site (or part of it) and in which seasons.
 * Used by the species tool and by the sidebar when a plant is opened from a card about a site.
 */
export async function speciesAt(slug: string, place?: string | null, part?: string | null) {
  const d = await speciesDetail(slug);
  if (!d.found || !place) return lean({ ...d, here: null });
  const parcel = part ? await parcelId(place, part) : undefined;
  const { split, rows } = await getWrt().records({ place, ...(parcel ? { parcel } : {}), species: slug });
  const season = new Map(rows.map((v) => [v.season.slug, v.season]));
  const seasons = [...groupSplits(rows.map((v) => v.record), (r) => r.seasonSlug)]
    .map(([k, s]) => ({ label: season.get(k)!.label, order: season.get(k)!.order, total: s.total }))
    .sort((x, y) => x.order - y.order);
  const label = (parcel && part) || rows[0]?.place.name || place;
  return lean({
    ...d,
    here: { place, placeName: rows[0]?.place.name ?? place, part: parcel ? part! : null, label, split, seasons, first: seasons[0]?.label ?? null, last: seasons.at(-1)?.label ?? null },
  });
}

// ponytail: one object. Move a tool to lib/chat/tools/<name>.ts once it holds its own logic or this file passes ~200 lines.
export const tools = {
  /** Names → sites, species, seasons. Called first. Wraps queries.search. Card: SearchChips */
  search: tool({
    description: "Find sites, parts of sites, species and seasons by English, Māori or botanical name. Only needed when unsure what a name refers to.",
    inputSchema: z.object({ q: z.string().min(3) }),
    execute: async ({ q }) => {
      const r = await getWrt().search(q, 5);
      return {
        places: r.places.map((p) => ({ slug: p.item.slug, name: p.item.name, total: p.split.total })),
        species: r.species.map((s) => ({
          slug: s.item.slug, name: s.item.displayName, scientific: s.item.scientificName, total: s.split.total,
        })),
        seasons: r.seasons.map((s) => ({ slug: s.season.slug, label: s.season.label })),
        // Parts of sites (e.g. "Gorge Rd Wetlands") aren't in queries.search, so match their names here.
        parts: (await partMatches(q)).slice(0, 5),
      };
    },
  }),

  /** One site: parts, top species, seasons, years, flags. Wraps queries.place. Card: PlaceCard */
  place: tool({
    description: "Summary of one site: totals, seasons, top species and its parts.",
    inputSchema: z.object({ name: name("Site") }),
    execute: async ({ name }) => {
      const r = await resolvePlace(name);
      return r ? placeDetail(r.slug) : { found: false as const };
    },
    toModelOutput: ({ output: o }) => brief(!o.found ? { found: false } : {
      site: named(o.place, o.split), firstSeason: o.span?.first.label, lastSeason: o.span?.last.label, seasonsWithRecords: o.span?.seasonsActive,
      species: o.species.length, topSpecies: o.species.slice(0, 8).map((r) => named(r.item, r.split)),
      parts: o.parts.map((p) => `${p.name} ${n(p.split)}`),
    }),
  }),

  /** One species: photo, profile, totals, top sites, and its count at a site if asked. Wraps queries.species. Card: PlantCard */
  species: tool({
    description: "One species by slug: reference photo, short profile, totals and where it went. "
      + "Pass place (and part) when the question is about it at a site.",
    inputSchema: z.object({
      name: name("Species"),
      place: z.string().nullish().describe("Site or part name or slug when the question is about this species at a site. Null otherwise."),
      part: z.string().nullish().describe("Part name when place is the whole site. Null otherwise."),
    }),
    execute: async ({ name, place, part }) => {
      const r = await resolveSpecies(name);
      if (!r || "choices" in r) return { found: false as const, here: null, choices: r?.choices ?? [] };
      const at = place ? await resolvePlace(place) : null;
      return speciesAt(r.slug, at?.slug, at?.part ?? part);
    },
    toModelOutput: ({ output: o }) => brief(!o.found ? o : {
      species: `${o.species.displayName} (${o.species.scientificName}) [${o.species.slug}]`, rank: o.rank, recorded: n(o.split),
      firstSeason: o.span?.first.label, lastSeason: o.span?.last.label, sites: o.places.length,
      topSites: o.places.slice(0, 5).map((r) => named(r.item, r.split)), profile: o.profile?.summary ?? null,
      here: o.here && { at: o.here.label, recorded: n(o.here.split), seasons: o.here.seasons.map((x) => `${x.label} ${x.total}`) },
    }),
  }),

  /** One season: places, species, site classes, workbook check. Wraps queries.season. Card: SeasonCard */
  season: tool({
    description: "Summary of one season: totals, top sites and top species.",
    inputSchema: z.object({ name: name("Season") }),
    execute: async ({ name }) => lean(slim(await getWrt().season(name.trim().toLowerCase().replace(/\s+/g, "-")))),
    toModelOutput: ({ output: o }) => brief(!o.found ? { found: false } : {
      season: o.season.label, recorded: n(o.split), sites: o.places.length, species: o.species.length,
      topSites: o.places.slice(0, 8).map((r) => named(r.item, r.split)), topSpecies: o.species.slice(0, 8).map((r) => named(r.item, r.split)),
    }),
  }),

  /** Totals for a filter, grouped by species, place or season. Wraps queries.records. Card: RecordsCard */
  records: tool({
    description: "Recorded totals for a filter, grouped. Use for 'what went in at X in Y' and 'how many X at Y'.",
    inputSchema: z.object({
      // Models fill every field they see, so each one says when to leave it null.
      place: z.string().nullish().describe("Site or part name or slug. Null for all sites."),
      part: z.string().nullish().describe("A part name when place is the whole site. Null when the question is about the whole site."),
      species: z.string().nullish().describe("Species name or slug. Null for all species."),
      // ponytail: single year only; add yearFrom/yearTo to RecordFilter when staff ask "since 2020"
      year: z.number().int().min(1000).max(9999).nullish().describe("Only when the question names a year."),
      season: z.enum(["Autumn", "Spring"]).nullish().describe("Only when the question says autumn or spring. Null otherwise."),
      review: z.enum(["all", "needs-review", "resolved"]).nullish().describe("Null unless the question is about review status."),
      trait: z.enum(["over5m", "threatened"]).nullish().describe("Only for tall trees (over 5 m) or species WRT marks threatened. Null otherwise."),
      siteClass: z.enum(["keystone", "community", "school"]).nullish().describe("Only when the question names keystone, community or school sites. Null otherwise."),
      groupBy: z.enum(["species", "place", "season"]).default("species"),
    }),
    execute: async ({ groupBy, part: asked, trait, siteClass, ...input }) => {
      // Drop nulls and empty strings so an unset field never narrows the filter.
      const filter = Object.fromEntries(Object.entries(input).filter(([, v]) => v != null && v !== "")) as RecordFilter;
      // Names → slugs (a part's name gives its site and the part).
      const at = filter.place ? await resolvePlace(filter.place) : null;
      if (at) filter.place = at.slug;
      const part = at?.part ?? asked; // a part named as place wins (models sometimes swap place and part)
      const sp = filter.species ? await resolveSpecies(filter.species) : null;
      if (sp && "slug" in sp) filter.species = sp.slug;
      // ponytail: the parcel id reaches the model in `filter`; the prompt says never to show ids
      if (part && filter.place) {
        const parcel = await parcelId(filter.place, part);
        if (parcel) filter.parcel = parcel;
      }
      const all = await getWrt().records(filter);
      // Plant traits and site classes aren't in RecordFilter, so they narrow the rows here.
      const rows = all.rows.filter((v) => (!trait || v.species[trait] === true) && (!siteClass || v.record.siteClass === siteClass));
      const split = trait || siteClass ? groupSplits(rows.map((v) => v.record), () => 0).get(0) ?? emptySplit() : all.split;
      const keyOf = {
        species: (r: PlantingRecord) => r.speciesId,
        place: (r: PlantingRecord) => r.placeSlug,
        season: (r: PlantingRecord) => r.seasonSlug,
      }[groupBy];
      const nameOf = (v: RecordView) =>
        groupBy === "species" ? { slug: v.species.slug, name: v.species.displayName, species: v.species }
        : groupBy === "place" ? { slug: v.place.slug, name: v.place.name }
        : { slug: v.season.slug, name: v.season.label, order: v.season.order };
      const names = new Map(rows.map((v) => [keyOf(v.record), nameOf(v)]));
      const groups = [...groupSplits(rows.map((v) => v.record), keyOf)]
        .map(([key, s]) => ({ ...names.get(key)!, split: s }))
        // Seasons oldest first; species and places biggest first.
        .sort((a, b) => (groupBy === "season" ? (a.order ?? 0) - (b.order ?? 0) : b.split.total - a.split.total));
      // First and last season for every answer, so "when" is on the card even when grouped by species.
      const seasons = rows.map((v) => v.season).sort((a, b) => a.order - b.order);
      const first = rows[0];
      const narrowed = [trait && TRAITS[trait], siteClass && `${siteClass} sites`];
      const label = [filter.parcel ? part : filter.place && first?.place.name, filter.species && first?.species.displayName, ...narrowed, filter.season, filter.year]
        .filter(Boolean).join(" · ") || "All records";
      return lean({
        filter, label, groupBy, split, groups: groups.slice(0, 25), groupCount: groups.length,
        // Names for the scope bar (the filter only has slugs and ids).
        names: { place: filter.place ? first?.place.name ?? null : null, part: filter.parcel ? part! : null, species: filter.species ? first?.species.displayName ?? null : null },
        first: seasons[0]?.label ?? null, last: seasons.at(-1)?.label ?? null,
        seasonCount: new Set(seasons.map((s) => s.slug)).size,
      });
    },
    toModelOutput: ({ output: o }) => brief({
      label: o.label, recorded: n(o.split), records: o.split.records,
      firstSeason: o.first, lastSeason: o.last, seasonsWithRecords: o.seasonCount,
      [`by ${o.groupBy}`]: o.groups.slice(0, o.groupBy === "season" ? 25 : 10).map((g) => (o.groupBy === "season" ? `${g.name} ${n(g.split)}` : named(g, g.split))),
      more: Math.max(0, o.groupCount - (o.groupBy === "season" ? 25 : 10)),
    }),
  }),

  /** Every site, species or season with totals and first/last season. Card: ListCard */
  list: tool({
    description: "All sites, species or seasons with totals and first and last season. Use for 'gone quiet', 'what's new', 'busiest'.",
    inputSchema: z.object({ kind: z.enum(["places", "species", "seasons"]) }),
    execute: async ({ kind }) => {
      const wrt = getWrt();
      if (kind === "seasons") {
        return { kind, rows: (await wrt.seasons()).map((s) => ({ slug: s.season.slug, name: s.season.label, split: s.split })) };
      }
      if (kind === "places") {
        return { kind, rows: (await wrt.places()).map((p) => ({
          slug: p.item.slug, name: p.item.name, split: p.split, first: p.span.first.label, last: p.span.last.label })) };
      }
      return lean({ kind, rows: (await wrt.speciesList()).map((s) => ({
        slug: s.item.slug, name: s.item.displayName, species: s.item, split: s.split, first: s.span.first.label, last: s.span.last.label })) });
    },
    toModelOutput: ({ output: o }) => brief({
      kind: o.kind, rows: o.rows.map((r) => `${named(r, r.split)}${"first" in r ? `, ${r.first} → ${r.last}` : ""}`),
    }),
  }),

  /** What still needs a WRT ruling, by reason, and how totals match the workbook. Wraps queries.dataQuality. Card: QualityCard */
  data_quality: tool({
    description: "Records waiting on a WRT ruling, grouped by reason, and how the totals match the workbook.",
    inputSchema: z.object({}),
    execute: async () => {
      const d = await getWrt().dataQuality();
      return { split: d.split, themes: d.themes, reconciliation: d.reconciliation };
    },
  }),
};

/** What the chat is about now: shown in the scope bar and sent with each question. */
export type Scope = {
  place?: { slug: string; name: string };
  part?: string;
  species?: { slug: string; name: string };
  season?: SeasonName;
  year?: number;
};

/** One prompt line, so a follow-up like "when were they planted?" keeps to the scope the user can see. */
export function scopeLine(s: Scope) {
  const bits = [
    s.place && `place ${s.place.slug}`, s.part && `part "${s.part}"`, s.species && `species ${s.species.slug}`,
    s.season && `season ${s.season}`, s.year && `year ${s.year}`,
  ].filter(Boolean);
  return bits.length
    ? `- Current scope, shown to the user: ${bits.join(", ")}. A question that names nothing else is about this scope; pass it to the tools.`
    : "- No scope is set: a question that names nothing is about all sites.";
}

/** Sent with each answer for the Dev panel: which model, how long, how many tokens. */
export type ChatMeta = { model?: string; ms?: number; usage?: LanguageModelUsage };

export type ChatMessage = UIMessage<ChatMeta, never, InferUITools<typeof tools>>;
