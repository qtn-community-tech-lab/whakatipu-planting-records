/** Shapes returned by the bounded, read-only history RPCs. */
import { z } from "zod";
import type { Parcel, Place, ReconciliationRow, Season, Species } from "@/lib/wrt/types";
import { searchKey } from "@/lib/wrt/text";

export const splitSchema = z.object({
  total: z.number(), resolved: z.number(), needsReview: z.number(),
  records: z.number(), recordsNeedingReview: z.number(),
});
const count = z.number();
export const summarySchema = z.object({
  totals: splitSchema.extend({ sites: count, species: count, seasons: count,
    firstSeason: count.nullable(), lastSeason: count.nullable() }),
  rows: z.array(z.object({
    site: z.string().nullable().default(null), area: z.string().nullable().default(null), species: z.string().nullable().default(null), season: z.string().nullable().default(null),
    class: z.enum(["keystone", "community", "school", "unknown"]).nullable().default(null),
    precision: z.enum(["site", "subsite", "area", "scheme", "unknown"]).nullable().default(null),
    confidence: z.enum(["high", "medium", "low"]).nullable().default(null), theme: z.string().nullable().default(null),
    split: splitSchema, siteCount: count.default(0), speciesCount: count.default(0), seasonCount: count.default(0),
    firstSeason: count.nullable().default(null), lastSeason: count.nullable().default(null),
  })),
});
export type Summary = z.infer<typeof summarySchema>;
export type SummaryRow = Summary["rows"][number];
export type Dimension = "site" | "area" | "species" | "season" | "class" | "precision" | "confidence" | "theme";

const photoSchema = z.object({ src: z.string(), attribution: z.string(),
  sourceUrl: z.string().optional(), licenseUrl: z.string().optional() });
export const referenceSpeciesSchema = z.object({
  slug: z.string(), register_code: z.string().nullable(), scientific_name: z.string(),
  suggested_spelling: z.string().nullable(), common_name: z.string().nullable(), maori_name: z.string().nullable(),
  status: z.enum(["core", "appended", "contested", "seedlog_only"]).nullable(),
  over_5m: z.boolean().nullable(), threatened: z.boolean().nullable(), threatened_te_kakano: z.boolean(),
  contested_group: z.string().nullable(), needs_decision: z.boolean(), deactivated_at: z.string().nullable(),
  photos: z.array(photoSchema), aliases: z.array(z.string()).default([]),
  register_note: z.string().nullable().optional(),
  summary: z.string().nullable().default(null), look_for: z.string().nullable().default(null),
  maori_name_alternatives: z.array(z.string()).default([]),
  sources: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
  checked_at: z.string().nullable().default(null),
});
const referencesSchema = z.object({
  seasons: z.array(z.object({ id: count, slug: z.string(), label: z.string(), year: count,
    half: z.enum(["autumn", "spring"]), workbook_total: count.nullable(), workbook_cell: z.string().nullable() })),
  sites: z.array(z.object({ slug: z.string(), name: z.string(), description: z.string(), deactivated_at: z.string().nullable(),
    classes: z.array(z.enum(["keystone", "community", "school", "unknown"])) })),
  areas: z.array(z.object({ slug: z.string(), site: z.string(), name: z.string(), wrt_number: z.string().nullable(),
    class: z.enum(["keystone", "community", "school"]).nullable(), deactivated_at: z.string().nullable(), aliases: z.array(z.string()) })),
  species: z.array(referenceSpeciesSchema),
});

const keys = (terms: (string | null)[]) => [...new Set(terms.map((term) => searchKey(term ?? "")).filter(Boolean))];

export function toSpecies(row: z.infer<typeof referenceSpeciesSchema>, others: z.infer<typeof referenceSpeciesSchema>[] = []): Species {
  const displayName = row.maori_name ?? row.common_name ?? row.scientific_name;
  return {
    id: row.register_code ?? row.slug, slug: row.slug, scientificName: row.scientific_name,
    suggestedSpelling: row.suggested_spelling, commonName: row.common_name, maoriName: row.maori_name,
    displayName, displayIsScientific: displayName === row.scientific_name,
    status: row.status ?? "unknown", over5m: row.over_5m, threatened: row.threatened,
    threatenedMarks: { plantsOutMaster: row.threatened === true, teKakano: row.threatened_te_kakano },
    needsDecision: row.needs_decision,
    contestedWith: row.contested_group ? others.filter((other) => other.contested_group === row.contested_group && other.slug !== row.slug)
      .map((other) => other.register_code ?? other.slug) : [],
    aliases: row.aliases.filter((alias) => alias !== row.scientific_name),
    searchKeys: keys([row.scientific_name, row.suggested_spelling, row.common_name, row.maori_name, ...row.aliases]),
    note: row.register_note ?? null, photos: row.photos.map((photo) => ({ src: photo.src, attribution: photo.attribution,
      ...(photo.sourceUrl === undefined ? {} : { sourceUrl: photo.sourceUrl }),
      ...(photo.licenseUrl === undefined ? {} : { licenseUrl: photo.licenseUrl }) })), deactivatedAt: row.deactivated_at,
    maoriNameAlternatives: row.maori_name_alternatives, summary: row.summary, lookFor: row.look_for,
    sources: row.sources, checkedAt: row.checked_at,
  };
}

export function toHistoryReferences(data: unknown) {
  const raw = referencesSchema.parse(data);
  const seasons: Season[] = raw.seasons.map((season, order) => ({
    slug: season.slug, label: season.label, year: season.year, name: season.half === "autumn" ? "Autumn" : "Spring", order,
  }));
  const species = raw.species.map((row) => toSpecies(row, raw.species));
  const parcels = new Map<string, Parcel>(raw.areas.map((area) => [area.slug, {
    id: area.wrt_number ?? area.slug, name: area.name, placeSlug: area.site,
    siteClass: area.class ?? "unknown", aliases: area.aliases, deactivatedAt: area.deactivated_at,
  }]));
  const places: Place[] = raw.sites.map((site) => {
    const parts = [...parcels.values()].filter((parcel) => parcel.placeSlug === site.slug);
    return {
      slug: site.slug, name: site.name, description: site.description, deactivatedAt: site.deactivated_at,
      parcels: parts, siteClasses: site.classes,
      searchKeys: keys([site.name, ...parts.flatMap((parcel) => [parcel.name, ...parcel.aliases])]),
    };
  });
  const seasonById = new Map(raw.seasons.map((row, index) => [row.id, seasons[index]!]));
  return { raw, seasons, species, places, parcels, seasonById,
    seasonBySlug: new Map(seasons.map((season) => [season.slug, season])),
    speciesBySlug: new Map(species.map((item) => [item.slug, item])),
    placeBySlug: new Map(places.map((item) => [item.slug, item])),
  };
}
export type HistoryReferences = ReturnType<typeof toHistoryReferences>;

export function reconciliation(refs: HistoryReferences, rows: SummaryRow[]): ReconciliationRow[] {
  return refs.raw.seasons.filter((season) => season.workbook_total !== null).map((season) => {
    const row = rows.find((item) => item.season === season.slug);
    const generated = row?.split.total ?? 0;
    return { kind: "season", label: season.label, generated, stated: season.workbook_total!,
      difference: generated - season.workbook_total!, statedCell: season.workbook_cell ?? "", records: row?.split.records ?? 0, cause: null };
  });
}
