/**
 * "What went in" for one season: every species recorded, as tiles, and a
 * compact list of sites with their most recorded species. The full species
 * list for a site lives on that site's page.
 */
import { speciesBySite, byTotalDesc, type RecordView } from "@/lib/wrt/queries";
import type { Season } from "@/lib/wrt/types";
import { hrefs } from "@/components/wrt/shared/names";
import { SpeciesTiles } from "@/components/wrt/species/species-tiles";
import { SiteRows } from "@/components/wrt/sites/site-rows";

function seasonQuery(season: Season) {
  return { year: season.year, season: season.name };
}

/** Every species recorded in the season, largest first. */
export function SeasonSpeciesGrid({ season, records }: { season: Season; records: RecordView[] }) {
  return (
    <SpeciesTiles
      records={records}
      spread="sites"
      hrefFor={(s) => hrefs.records({ ...seasonQuery(season), species: s.slug })}
    />
  );
}

/** Each site in the season with its few most recorded species. */
export function SeasonSiteSpecies({ season, records }: { season: Season; records: RecordView[] }) {
  const groups = [...speciesBySite(records).values()].sort(byTotalDesc);
  const max = Math.max(1, ...groups.map((g) => g.split.total));
  return (
    <SiteRows
      max={max}
      rows={groups.map((g) => ({
        key: g.place.slug,
        name: g.place.name,
        href: hrefs.place(g.place.slug),
        isScheme: g.place.isScheme,
        split: g.split,
        species: g.species,
        totalHref: hrefs.records({ ...seasonQuery(season), place: g.place.slug }),
        moreHref: g.place.isScheme ? hrefs.place(g.place.slug) : `${hrefs.place(g.place.slug)}?year=${season.year}#year-view`,
        speciesHref: (s) => hrefs.records({ ...seasonQuery(season), place: g.place.slug, species: s.slug }),
      }))}
    />
  );
}
