/**
 * The WRT data chat: system prompt and every tool the model can call.
 *
 * Each tool wraps a query that already exists in lib/wrt/queries.ts, so the
 * chat and the pages always give the same numbers. Each result is drawn by
 * the matching card in components/wrt/chat-cards.tsx.
 *
 * Lives here, not in the route, because Next route files may only export
 * handlers, and the cards need the ChatMessage type below.
 */
import "server-only";
import { tool, type InferUITools, type LanguageModelUsage, type UIMessage } from "ai";
import { z } from "zod";
import { emptySplit, groupSplits, type RecordFilter, type RecordView, type SeasonPoint } from "@/lib/wrt/queries";
import { getWrt } from "@/lib/wrt/server";
import { getSpeciesPhotos } from "@/lib/wrt/species-photos";
import { getSpeciesProfile } from "@/lib/wrt/species-profiles";
import { matchScore, searchKey } from "@/lib/wrt/text";
import { speciesBySite } from "@/components/wrt/sites/site-rows";
import type { PlantingRecord } from "@/lib/wrt/types";

export const SYSTEM = `You answer questions about the Wakatipu Reforestation Trust planting history, Autumn 2015 to Autumn 2026.
- Every number comes from a tool. Never estimate, add or subtract figures yourself.
- Say "recorded", never "planted": the history is the allocation sheet, not a checked count.
- Give each total with the part that needs review, e.g. "2,105 recorded (136 need review)".
- Some sites have parts, e.g. Gorge Rd Wetlands in Gorge Road area. For a part, pass both place and part to records.
- Call search first to turn names into slugs. If it finds nothing, say there is no such site or species.
- If several species match a name, list them and ask which one.
- "Last year" and "latest" mean the last seasons in the data. Spring 2026 is not in the data yet.
- Seasons are the dates: every record has a season (Autumn or Spring, and a year) but no day or month. For "when", call records with groupBy season and the same place, part and species as the last answer, then name the seasons.
- The data has no survival, stock, seed origin, funders, volunteers or reasons. Say so.
- When asked to show or see something, call a tool so a card appears, even if an earlier answer had the numbers.
- "Most likely to see" means the most recorded species there: call records grouped by species. Say it is by records, not by what survived.
- "Top 3 plants" or one plant "with its profile": call records for the place, then species for each plant asked for (at most three), passing the same place and part.
- "Parts of" or "sub-sections of" a site: call place.
- Never show ids such as SP-012 or site numbers.
- Write plain text: no markdown, asterisks or lists. Write the reply once, after your last tool call.
- Keep replies to one or two sentences and name at most three items. The cards under your reply show the rest.`;

const slug = z.string().describe("A slug returned by search, e.g. lake-hayes");

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
  return { ...slim(detail), parts };
}

/** One species with up to three photos, as the species tool and the chat sidebar both show it. */
export async function speciesDetail(slug: string) {
  const detail = await getWrt().species(slug);
  if (!detail) return { found: false as const };
  const rank = (await getWrt().speciesList()).findIndex((s) => s.item.slug === slug) + 1;
  return {
    ...slim(detail),
    rank,
    photos: getSpeciesPhotos(detail.species.id).slice(0, 3),
    profile: getSpeciesProfile(detail.species.id) ?? null,
  };
}

/** So "Gorge Road Wetlands" finds the part named "Gorge Rd Wetlands". */
const roads = (s: string) => s.toLowerCase().replace(/\broad\b/g, "rd").replace(/\bstreet\b/g, "st");

/** A part's id within its site, found by name ("Gorge Rd Wetlands"). */
export async function parcelId(place: string, part: string) {
  const site = (await getWrt().lookups()).places.find((p) => p.slug === place);
  return site?.parcels.find((c) => roads(searchKey(c.name)) === roads(searchKey(part)))?.id;
}

/**
 * A species, plus how many were recorded at one site (or part of it) and in which seasons.
 * Used by the species tool and by the sidebar when a plant is opened from a card about a site.
 */
export async function speciesAt(slug: string, place?: string | null, part?: string | null) {
  const d = await speciesDetail(slug);
  if (!d.found || !place) return { ...d, here: null };
  const parcel = part ? await parcelId(place, part) : undefined;
  const { split, rows } = await getWrt().records({ place, parcel, species: slug });
  const season = new Map(rows.map((v) => [v.season.slug, v.season]));
  const seasons = [...groupSplits(rows.map((v) => v.record), (r) => r.seasonSlug)]
    .map(([k, s]) => ({ label: season.get(k)!.label, order: season.get(k)!.order, total: s.total }))
    .sort((x, y) => x.order - y.order);
  const label = (parcel && part) || rows[0]?.place.name || place;
  return {
    ...d,
    here: { place, placeName: rows[0]?.place.name ?? place, part: parcel ? part! : null, label, split, seasons, first: seasons[0]?.label ?? null, last: seasons.at(-1)?.label ?? null },
  };
}

// ponytail: one object. Move a tool to lib/chat/tools/<name>.ts once it holds its own logic or this file passes ~200 lines.
export const tools = {
  /** Names → sites, species, seasons. Called first. Wraps queries.search. Card: SearchChips */
  search: tool({
    description: "Find sites, species and seasons by English, Māori or botanical name. Call before any other tool.",
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
        parts: (await getWrt().lookups()).places
          .flatMap((p) => p.parcels.map((c) => ({
            place: p.slug, placeName: p.name, part: c.name,
            score: matchScore(roads(q), [c.name, ...c.aliases].map((k) => roads(searchKey(k)))),
          })))
          .filter((x) => x.score >= 55 && x.part !== x.placeName)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
      };
    },
  }),

  /** One site: parts, top species, seasons, years, flags. Wraps queries.place. Card: PlaceCard */
  place: tool({
    description: "Summary of one site by slug.",
    inputSchema: z.object({ slug }),
    execute: ({ slug }) => placeDetail(slug),
  }),

  /** One species: photo, profile, totals, top sites, and its count at a site if asked. Wraps queries.species. Card: PlantCard */
  species: tool({
    description: "One species by slug: reference photo, short profile, totals and where it went. "
      + "Pass place (and part) when the question is about it at a site, e.g. 'profiles of the plants at Gorge Rd Wetlands'.",
    inputSchema: z.object({
      slug,
      place: z.string().nullish().describe("Place slug when the question is about this species at a site. Null otherwise."),
      part: z.string().nullish().describe("Part name, e.g. Gorge Rd Wetlands, when the question is about a part. Needs place. Null otherwise."),
    }),
    execute: ({ slug, place, part }) => speciesAt(slug, place, part),
  }),

  /** One season: places, species, site classes, workbook check. Wraps queries.season. Card: SeasonCard */
  season: tool({
    description: "Summary of one season by slug, e.g. autumn-2026.",
    inputSchema: z.object({ slug }),
    execute: async ({ slug }) => slim(await getWrt().season(slug)),
  }),

  /** Totals for a filter, grouped by species, place or season. Wraps queries.records. Card: RecordsCard */
  records: tool({
    description: "Recorded totals for a filter, grouped. Use for 'what went in at X in Y' and 'how many X at Y'.",
    inputSchema: z.object({
      // Models fill every field they see, so each one says when to leave it null.
      place: z.string().nullish().describe("Place slug from search. Null for all sites."),
      part: z.string().nullish().describe("Only when the question names a part, e.g. Gorge Rd Wetlands. Needs place too. Null when the question names the whole site, even if search found parts."),
      species: z.string().nullish().describe("Species slug from search. Null for all species."),
      // ponytail: single year only; add yearFrom/yearTo to RecordFilter when staff ask "since 2020"
      year: z.number().int().min(2015).max(2026).nullish().describe("Only when the question names a year."),
      season: z.enum(["Autumn", "Spring"]).nullish().describe("Only when the question says autumn or spring. Null otherwise."),
      review: z.enum(["all", "needs-review", "resolved"]).nullish().describe("Null unless the question is about review status."),
      groupBy: z.enum(["species", "place", "season"]).default("species"),
    }),
    execute: async ({ groupBy, part, ...input }) => {
      // Drop nulls and empty strings so an unset field never narrows the filter.
      const filter = Object.fromEntries(Object.entries(input).filter(([, v]) => v != null && v !== "")) as RecordFilter;
      // ponytail: the parcel id reaches the model in `filter`; the prompt says never to show ids
      if (part && filter.place) filter.parcel = await parcelId(filter.place, part);
      const { split, rows } = await getWrt().records(filter);
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
      const label = [filter.parcel ? part : filter.place && first?.place.name, filter.species && first?.species.displayName, filter.season, filter.year]
        .filter(Boolean).join(" · ") || "All records";
      return {
        filter, label, groupBy, split, groups: groups.slice(0, 25), groupCount: groups.length,
        // Names for the scope bar (the filter only has slugs and ids).
        names: { place: filter.place ? first?.place.name ?? null : null, part: filter.parcel ? part! : null, species: filter.species ? first?.species.displayName ?? null : null },
        first: seasons[0]?.label ?? null, last: seasons.at(-1)?.label ?? null,
        seasonCount: new Set(seasons.map((s) => s.slug)).size,
      };
    },
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
      return { kind, rows: (await wrt.speciesList()).map((s) => ({
        slug: s.item.slug, name: s.item.displayName, species: s.item, split: s.split, first: s.span.first.label, last: s.span.last.label })) };
    },
  }),

  /** What still needs a WRT ruling, by reason, and how totals match the workbook. Wraps queries.dataQuality. Card: QualityCard */
  data_quality: tool({
    description: "Records waiting on a WRT ruling, grouped by reason, and how the totals match the workbook.",
    inputSchema: z.object({}),
    execute: async () => {
      const d = await getWrt().dataQuality();
      return { split: d.split, themes: d.themes, reconciliation: d.reconciliation.filter((r) => r.kind !== "season") };
    },
  }),
};

/** What the chat is about now: shown in the scope bar, sent with each question, drawn by the timeline. */
export type Scope = {
  place?: { slug: string; name: string };
  part?: string;
  species?: { slug: string; name: string };
  season?: "Autumn" | "Spring";
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

/** Recorded plants per season for a scope, across every season in the data. Season and year are left out so the whole span shows. */
export async function timelineFor(scope: Scope): Promise<SeasonPoint[]> {
  const wrt = getWrt();
  const place = scope.place?.slug;
  const parcel = place && scope.part ? await parcelId(place, scope.part) : undefined;
  const { rows } = await wrt.records({ place, parcel, species: scope.species?.slug });
  const by = groupSplits(rows.map((v) => v.record), (r) => r.seasonSlug);
  return (await wrt.seasons()).map((s) => ({ season: s.season, split: by.get(s.season.slug) ?? emptySplit() }));
}

/** Sent with each answer for the Dev panel: which model, how long, how many tokens. */
export type ChatMeta = { model?: string; ms?: number; usage?: LanguageModelUsage };

export type ChatMessage = UIMessage<ChatMeta, never, InferUITools<typeof tools>>;
