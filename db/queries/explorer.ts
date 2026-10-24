/** Complete active rows for the explorer. No cache; each call reads Supabase. */
import type { Db, Database } from "@/db/types";
import type { ExplorerData, Location, Provenance, SiteClass } from "@/lib/wrt/types";
import { searchKey } from "@/lib/wrt/text";
import { findLines, PAGE_SIZE as LINE_PAGE_SIZE } from "./plantings";

const PAGE_SIZE = 1000;
type Table = "species" | "sites" | "planting_areas" | "locations" | "seasons";

/** Stable pagination also covers reference catalogues that grow beyond 1,000 rows. */
async function readTable<T extends Table>(db: Db, table: T) {
  const rows: Database["public"]["Tables"][T]["Row"][] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data } = await db
      .from(table)
      .select("*")
      .is("deactivated_at", null)
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1)
      .throwOnError();
    // Supabase cannot infer the row union for a generic table name.
    const page = data as unknown as Database["public"]["Tables"][T]["Row"][];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function readExplorer(db: Db): Promise<ExplorerData> {
  const [species, sites, areas, pins, seasons, lines] = await Promise.all([
    readTable(db, "species"), readTable(db, "sites"), readTable(db, "planting_areas"), readTable(db, "locations"),
    readTable(db, "seasons"),
    (async () => {
      const rows: Awaited<ReturnType<typeof findLines>> = [];
      for (let page = 0; ; page++) {
        const batch = await findLines(db, {}, page);
        rows.push(...batch);
        if (batch.length < LINE_PAGE_SIZE) return rows;
      }
    })(),
  ]);
  const locations = new Map<string, Location>(pins.map((p) => [p.id, {
    id: p.id, label: p.label, longitude: p.geometry.coordinates[0], latitude: p.geometry.coordinates[1],
    radiusM: p.radius_m, sourceUrl: p.source_url, coordinateSourceUrl: p.coordinate_source_url,
    coordinateMethod: p.coordinate_method, checkedOn: p.checked_on,
  }]));
  const location = (id: string | null) => id ? locations.get(id) ?? null : null;
  const places = sites.map((site) => {
    const parcels = areas.filter((a) => a.site_id === site.id)
      .map((area) => ({
        id: area.id, slug: area.slug, name: area.name, description: area.description, placeSlug: site.slug,
        siteClass: area.site_class ?? "unknown" as SiteClass, aliases: area.aliases,
        location: location(area.location_id) ?? location(site.location_id),
      }));
    return {
      slug: site.slug, name: site.name, description: site.description, location: location(site.location_id),
      siteClasses: [...new Set(parcels.map((a) => a.siteClass))], isScheme: site.is_scheme, parcels,
      searchKeys: [site.name, ...parcels.flatMap((a) => [a.name, ...a.aliases])].map(searchKey),
    };
  });
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const records = lines.map((line) => {
    const event = line.event;
    const area = event.planting_area_id ? areaById.get(event.planting_area_id) : undefined;
    const raw = line.provenance;
    const provenance: Provenance = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const key of ["sourceFile", "sourceSheet", "sourceCell", "seasonLabelOriginal", "siteOriginal", "speciesOriginal"] as const) {
        // Accept the camelCase explorer keys and snake_case workbook import keys.
        const value = raw[key] ?? raw[key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)];
        if (typeof value === "string") provenance[key] = value;
      }
    }
    return {
      id: line.id, seasonSlug: event.season, seasonName: event.season,
      year: event.planting_date ? Number(event.planting_date.slice(0, 4)) : null,
      plantingDate: event.planting_date, placeSlug: event.site.slug,
      parcelId: event.planting_area_id, parcelName: event.area?.name ?? "",
      siteClass: area?.site_class ?? "unknown" as SiteClass, speciesId: line.species_id,
      quantity: line.quantity, precision: line.precision ?? "unknown" as const,
      notes: event.notes, source: event.source, provenance,
    };
  });
  return {
    seasons: seasons.map((s) => s.name),
    places,
    records,
    species: species.map((s) => {
      const displayName = s.maori_name || s.common_name || s.scientific_name;
      return {
        id: s.id, slug: s.slug, scientificName: s.scientific_name,
        commonName: s.common_name || null, maoriName: s.maori_name,
        displayName, displayIsScientific: displayName === s.scientific_name,
        description: s.description, imageUrl: s.image_url,
        over5m: s.over_5m, threatened: s.threatened,
        threatenedMarks: { plantsOutMaster: s.threatened === true, teKakano: s.threatened_te_kakano },
        aliases: s.aliases, searchKeys: [s.scientific_name, s.common_name, s.maori_name ?? "", ...s.aliases].map(searchKey),
        note: s.register_note,
      };
    }),
  };
}
