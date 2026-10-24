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

import type { PlantingRecord, Quantity, SeasonName } from "@/lib/wrt/types";

export const SYSTEM = `You answer questions about Whakatipu Reforestation Trust using the saved database records.
Every count and factual catalogue answer must come from a tool. Never invent missing planting history.
Answer plainly in one or two sentences; the cards show the details. Call quantities recorded plants.
Unknown counts and dates are unknown, not zero. Totals sum only known counts.
Seasons are free-text labels grouped across years. Year filters use planting dates; never infer a year from a label.
Use names or slugs for sites and species. Search when unsure. Sites and species may exist without planting records.
Descriptions contain species references and image credits, not proof of an observation at a planting site.
Use current calendar dates for relative years and query the relevant year; never assume a fixed historical range.
Do not claim records are confirmed, resolved or awaiting approval. Saved data is the source of truth.
Never display internal IDs. Write plain text, without markdown.`;

const name = (what: string, e: string) => z.string().describe(`${what} name or slug, e.g. ${e}`);

// ---- What the model reads. Tools return everything the cards draw; the model gets a short brief
// (toModelOutput), and so does the history on every later question (convertToModelMessages with tools).

/** Known recorded quantity, with any unknown counts spelled out. */
const n = (s: Quantity) => `${s.total}${s.unknown ? ` (${s.unknown} unknown counts)` : ""}`;
const named = (x: { name?: string; displayName?: string; slug: string }, s: Quantity) => `${x.displayName ?? x.name} [${x.slug}] ${n(s)}`;
const TRAITS = { over5m: "Over 5 m", threatened: "Marked threatened by WRT" } as const;
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
    return { name: p.item.name, slug: p.item.slug, split: p.split, span: p.span, speciesCount: species.length, species: species.slice(0, 3) };
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

  };
}

/** So "Gorge Road Wetlands" finds the part named "Gorge Rd Wetlands". */
const roads = (s: string) => s.toLowerCase().replace(/\broad\b/g, "rd").replace(/\bstreet\b/g, "st");

/** A part's id within its site, found by name ("Gorge Rd Wetlands"). */
async function parcelId(place: string, part: string) {
  const site = (await getWrt().lookups()).places.find((p) => p.slug === place);
  return site?.parcels.find((c) => roads(searchKey(c.name)) === roads(searchKey(part)))?.slug;
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
  if (exact || species.length === 1) return { slug: (exact ?? species[0]).item.slug };
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
  const { split, rows } = part && !parcel
    ? { split: emptySplit(), rows: [] as RecordView[] }
    : await getWrt().records({ place, parcel, species: slug });
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
    inputSchema: z.object({ name: name("Site", "Lake Hayes") }),
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
      + "Pass place (and part) when the question is about it at a site, e.g. 'profiles of the plants at Gorge Rd Wetlands'.",
    inputSchema: z.object({
      name: name("Species", "kōwhai"),
      place: z.string().nullish().describe("Site or part name or slug when the question is about this species at a site. Null otherwise."),
      part: z.string().nullish().describe("Part name, e.g. Gorge Rd Wetlands, when place is the whole site. Null otherwise."),
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
      topSites: o.places.slice(0, 5).map((r) => named(r.item, r.split)), profile: o.species.description || null,
      here: o.here && { at: o.here.label, recorded: n(o.here.split), seasons: o.here.seasons.map((x) => `${x.label} ${x.total}`) },
    }),
  }),

  /** One season: places, species and site classes. Wraps queries.season. Card: SeasonCard */
  season: tool({
    description: "Summary of one season: totals, top sites and top species.",
    inputSchema: z.object({ name: name("Season", "winter") }),
    execute: async ({ name }) => lean(slim(await getWrt().season(name))),
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
      part: z.string().nullish().describe("A part name, e.g. Gorge Rd Wetlands, when place is the whole site. Null when the question is about the whole site."),
      species: z.string().nullish().describe("Species name or slug. Null for all species."),
      // ponytail: single year only; add yearFrom/yearTo to RecordFilter when staff ask "since 2020"
      year: z.number().int().min(1).max(9999).nullish().describe("Only when the question names a year."),
      season: z.string().nullish().describe("Exact saved season label. Null for all labels."),
      trait: z.enum(["over5m", "threatened"]).nullish().describe("Only for tall trees (over 5 m) or species WRT marks threatened. Null otherwise."),
      siteClass: z.enum(["keystone", "community", "school"]).nullish().describe("Only when the question names keystone, community or school sites. Null otherwise."),
      groupBy: z.enum(["species", "place", "season"]).default("species"),
    }),
    execute: async ({ groupBy, part: asked, trait, siteClass, ...input }) => {
      // Drop nulls and empty strings so an unset field never narrows the filter.
      const filter = Object.fromEntries(Object.entries(input).filter(([key, v]) => v != null && (key === "season" || v !== ""))) as RecordFilter;
      // Names → slugs (a part's name gives its site and the part).
      const at = filter.place ? await resolvePlace(filter.place) : null;
      if (at) filter.place = at.slug;
      const part = at?.part ?? asked; // a part named as place wins (models sometimes swap place and part)
      const sp = filter.species ? await resolveSpecies(filter.species) : null;
      if (sp && "slug" in sp) filter.species = sp.slug;
      // ponytail: the parcel id reaches the model in `filter`; the prompt says never to show ids
      if (part && filter.place) filter.parcel = await parcelId(filter.place, part);
      const all = part && !filter.parcel
        ? { rows: [] as RecordView[], split: emptySplit() }
        : await getWrt().records(filter);
      // Plant traits and site classes aren't in RecordFilter, so they narrow the rows here.
      const rows = all.rows.filter((v) => (!trait || (trait === "over5m" ? v.species.over5m === true : v.species.threatenedMarks.plantsOutMaster || v.species.threatenedMarks.teKakano)) && (!siteClass || v.record.siteClass === siteClass));
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
          slug: p.item.slug, name: p.item.name, split: p.split, first: p.span?.first.label ?? null, last: p.span?.last.label ?? null })) };
      }
      return lean({ kind, rows: (await wrt.speciesList()).map((s) => ({
        slug: s.item.slug, name: s.item.displayName, species: s.item, split: s.split, first: s.span?.first.label ?? null, last: s.span?.last.label ?? null })) });
    },
    toModelOutput: ({ output: o }) => brief({
      kind: o.kind, rows: o.rows.map((r) => `${named(r, r.split)}${"first" in r ? `, ${r.first} → ${r.last}` : ""}`),
    }),
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
  ].filter(Boolean);
  return `Current date: ${new Date().toISOString().slice(0, 10)}. ` + (bits.length
    ? `- Current scope, shown to the user: ${bits.join(", ")}. A question that names nothing else is about this scope; pass it to the tools.`
    : "- No scope is set: a question that names nothing is about all sites.");
}

/** Sent with each answer for the Dev panel: which model, how long, how many tokens. */
export type ChatMeta = { model?: string; ms?: number; usage?: LanguageModelUsage };

export type ChatMessage = UIMessage<ChatMeta, never, InferUITools<typeof tools>>;
