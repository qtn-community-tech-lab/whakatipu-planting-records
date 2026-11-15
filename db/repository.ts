/** The planting history and season-total checks from Supabase. */
import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { SUPABASE_TAG } from "@/db/cache";
import type { Database, Db } from "@/db/types";
import { PAGE_SIZE } from "@/db/queries/views";
import type { SourceInfo, WrtRepository } from "@/lib/wrt/repository";
import type {
  Confidence, Parcel, Place, PlantingRecord, Precision, ReconciliationRow,
  ReviewNoteKind, ReviewTheme, Season, SiteClass, Species,
} from "@/lib/wrt/types";
import { searchKey } from "@/lib/wrt/text";

/** Supabase as a signed-out visitor: the planting history is public to read. */
export function publicDb(): Db {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false },
      global: { fetch: (input, init) => fetch(input, {
        ...init, next: { revalidate: 300, tags: [SUPABASE_TAG] },
      }) },
    },
  );
}

type Loaded = {
  seasons: Season[];
  species: Species[];
  places: Place[];
  records: PlantingRecord[];
  reconciliation: ReconciliationRow[];
  info: SourceInfo;
};

/** Every line, oldest first, a page at a time. */
async function allLines(db: Db) {
  const out = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data } = await db
      .from("line_details")
      .select("line_id, legacy_code, season, area, area_name, class, species, quantity, needs_review, notes, source_cell, precision, confidence, source_file, source_sheet, season_original, site_original, species_original")
      .order("line_id")
      .range(from, from + PAGE_SIZE - 1)
      .throwOnError();
    out.push(...data);
    if (data.length < PAGE_SIZE) return out;
  }
}

async function load(db: Db): Promise<Loaded> {
  const [seasonRows, speciesRows, siteRows, areaRows, lines, seasonTotals] = await Promise.all([
    db.from("seasons").select("slug, label, year, half").order("id").throwOnError(),
    db.from("species")
      .select("slug, scientific_name, suggested_spelling, common_name, maori_name, status, over_5m, threatened, threatened_te_kakano, contested_group, needs_decision, register_code, register_note, profile, photos, deactivated_at")
      .throwOnError(),
    db.from("sites").select("slug, name, description, is_scheme").throwOnError(),
    db.from("areas").select("slug, site, name, wrt_number, class").is("deactivated_at", null).throwOnError(),
    allLines(db),
    db.from("totals_by_season").select("season_label, plants, lines, workbook_total, workbook_cell").order("season_order").throwOnError(),
  ]);

  // Seasons with lines only, numbered from 0, as the workbook has them.
  const withLines = new Set(lines.map((l) => l.season));
  const seasons: Season[] = seasonRows.data
    .filter((s) => withLines.has(s.slug))
    .map((s, order) => ({ slug: s.slug, label: s.label, year: s.year, name: s.half === "autumn" ? "Autumn" : "Spring", order }));
  const seasonBySlug = new Map(seasons.map((s) => [s.slug, s]));

  // Species: keep the original register code as the historical join key.
  const spellings = new Map<string, Set<string>>();
  for (const l of lines) {
    if (l.species_original) spellings.set(l.species!, (spellings.get(l.species!) ?? new Set()).add(l.species_original));
  }
  const idOf = (slug: string, code: string | null) => code ?? slug;
  const species: Species[] = speciesRows.data.map((s) => {
    const displayName = s.maori_name ?? s.common_name ?? s.scientific_name;
    const aliases = [...(spellings.get(s.slug) ?? [])].filter((a) => a !== s.scientific_name);
    const keys = new Set([s.scientific_name, s.suggested_spelling ?? "", s.common_name ?? "", s.maori_name ?? "", ...aliases].map(searchKey));
    keys.delete("");
    return {
      deactivatedAt: s.deactivated_at,
      id: idOf(s.slug, s.register_code),
      slug: s.slug,
      scientificName: s.scientific_name,
      suggestedSpelling: s.suggested_spelling,
      commonName: s.common_name,
      maoriName: s.maori_name,
      displayName,
      displayIsScientific: displayName === s.scientific_name,
      status: s.status ?? "unknown",
      over5m: s.over_5m,
      threatened: s.threatened,
      threatenedMarks: { plantsOutMaster: s.threatened === true, teKakano: s.threatened_te_kakano },
      needsDecision: s.needs_decision,
      contestedWith: s.contested_group
        ? speciesRows.data.filter((o) => o.contested_group === s.contested_group && o.slug !== s.slug).map((o) => idOf(o.slug, o.register_code))
        : [],
      aliases,
      searchKeys: [...keys],
      note: s.register_note,
      photos: s.photos as unknown as Species["photos"],
      profile: Object.keys(s.profile ?? {}).length ? s.profile as unknown as Species["profile"] : null,
    };
  });
  const speciesIdBySlug = new Map(species.map((s) => [s.slug, s.id]));

  // Parts keep WRT’s own number as their id for links and map pins.
  const areaBySlug = new Map(areaRows.data.map((a) => [a.slug, a]));
  const partId = (slug: string) => areaBySlug.get(slug)?.wrt_number ?? slug;

  const records: PlantingRecord[] = lines.map((l) => {
    const season = seasonBySlug.get(l.season!)!;
    const notes = (l.notes as { question: string; kind: ReviewNoteKind; text: string }[] | null) ?? [];
    return {
      id: l.legacy_code ?? `line-${l.line_id}`,
      seasonSlug: season.slug,
      year: season.year,
      seasonName: season.name,
      placeSlug: areaBySlug.get(l.area!)!.site,
      parcelId: partId(l.area!),
      parcelName: l.area_name!,
      siteClass: (l.class ?? "unknown") as SiteClass,
      speciesId: speciesIdBySlug.get(l.species!)!,
      quantity: l.quantity ?? 0,
      hasQuantity: l.quantity !== null,
      precision: (l.precision ?? "unknown") as Precision,
      confidence: (l.confidence ?? "high") as Confidence,
      needsReview: l.needs_review === true,
      // The import keeps one note per question, a line each: split them back.
      notes: notes.flatMap((n) => n.text.split("\n").map((text) => ({ kind: n.kind, theme: n.question as ReviewTheme, text, raw: text }))),
      provenance: {
        sourceFile: l.source_file ?? "",
        sourceSheet: l.source_sheet ?? "",
        sourceCell: l.source_cell ?? "",
        seasonLabelOriginal: l.season_original ?? season.label,
        siteOriginal: l.site_original ?? "",
        speciesOriginal: l.species_original ?? "",
      },
    };
  });
  records.sort((a, b) => seasonBySlug.get(a.seasonSlug)!.order - seasonBySlug.get(b.seasonSlug)!.order || a.id.localeCompare(b.id));

  // Keep historical site identities, including deactivated sites, and active areas.
  // Classes are ranked by recorded plants; header spellings remain aliases.
  const places: Place[] = siteRows.data
    .map((site) => {
      const parcels = new Map<string, Parcel>();
      const plantsByClass = new Map<SiteClass, number>();
      for (const area of areaRows.data) {
        if (area.site !== site.slug) continue;
        const siteClass = (area.class ?? "unknown") as SiteClass;
        parcels.set(area.slug, { id: partId(area.slug), name: area.name, placeSlug: site.slug, siteClass, aliases: [] });
        plantsByClass.set(siteClass, 0);
      }
      for (const l of lines) {
        const area = areaBySlug.get(l.area!)!;
        if (area.site !== site.slug) continue;
        const siteClass = (area.class ?? "unknown") as SiteClass;
        const parcel = parcels.get(area.slug) ?? { id: partId(area.slug), name: area.name, placeSlug: site.slug, siteClass, aliases: [] };
        if (l.site_original && !parcel.aliases.includes(l.site_original)) parcel.aliases.push(l.site_original);
        parcels.set(area.slug, parcel);
        plantsByClass.set(siteClass, (plantsByClass.get(siteClass) ?? 0) + (l.quantity ?? 0));
      }
      const parts = [...parcels.values()].sort((a, b) => a.name.localeCompare(b.name));
      const keys = new Set([site.name, ...parts.flatMap((p) => [p.name, ...p.aliases])].map(searchKey));
      keys.delete("");
      return {
        slug: site.slug,
        name: site.name,
        description: site.description,
        siteClasses: [...plantsByClass].sort((a, b) => b[1] - a[1]).map(([c]) => c),
        isScheme: site.is_scheme,
        parcels: parts,
        searchKeys: [...keys],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Each season against its workbook TOTAL cell, all read from Supabase.
  const seasonChecks: ReconciliationRow[] = seasonTotals.data
    .filter((s) => s.workbook_total !== null)
    .map((s) => ({
      kind: "season", label: s.season_label!, generated: s.plants ?? 0, stated: s.workbook_total!,
      difference: (s.plants ?? 0) - s.workbook_total!, statedCell: s.workbook_cell ?? "", records: s.lines ?? 0, cause: null,
    }));

  return {
    seasons, species, places, records,
    reconciliation: seasonChecks,
    info: {
      description:
        "Read from the Trust's Supabase database, imported from the MASTER sheet of WRT's Plants Out Master workbook: one line per species, site and season.",
      tables: [
        { name: "seasons", rows: seasons.length },
        { name: "species", rows: species.length },
        { name: "sites", rows: places.length },
        { name: "areas", rows: areaRows.data.length },
        { name: "planting lines", rows: records.length },
      ],
    },
  };
}

export class SupabaseWrtRepository implements WrtRepository {
  constructor(private readonly db: () => Db = publicDb) {}

  private data = cache(() => load(this.db()));

  private read = <K extends keyof Loaded>(key: K) => async () => (await this.data())[key];

  listSeasons = this.read("seasons");
  listSpecies = this.read("species");
  listPlaces = this.read("places");
  listRecords = this.read("records");
  listReconciliation = this.read("reconciliation");
  getSourceInfo = this.read("info");
}
