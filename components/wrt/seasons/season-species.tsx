/**
 * "What went in" for one season: every species recorded, as tiles, and a
 * compact list of sites with their most recorded species. The full species
 * list for a site lives on that site's page.
 */
import { byTotalDesc } from "@/lib/wrt/queries";
import type { HistoryCell } from "@/lib/wrt/presentation";
import { speciesAtPlaces, tileRows } from "@/lib/wrt/presentation";
import type { Season } from "@/lib/wrt/types";
import { hrefs } from "@/components/wrt/shared/names";
import { SpeciesTiles } from "@/components/wrt/species/species-tiles";
import { SiteRows } from "@/components/wrt/sites/site-rows";

function seasonQuery(season: Season) {
  return { year: season.year, season: season.name };
}

/** Every species recorded in the season, largest first. */
export function SeasonSpeciesGrid({ season, cells }: { season: Season; cells: HistoryCell[] }) {
  return (
    <SpeciesTiles
      rows={tileRows(cells, "sites")}
      spread="sites"
      hrefFor={(s) => hrefs.records({ ...seasonQuery(season), species: s.slug })}
    />
  );
}

/** Each site in the season with its few most recorded species. */
export function SeasonSiteSpecies({ season, cells }: { season: Season; cells: HistoryCell[] }) {
  const groups = [...speciesAtPlaces(cells).values()].sort(byTotalDesc);
  const max = Math.max(1, ...groups.map((g) => g.split.total));
  return (
    <SiteRows
      max={max}
      rows={groups.map((g) => ({
        key: g.place.slug,
        name: g.place.name,
        href: hrefs.place(g.place.slug),
        split: g.split,
        species: g.species,
        totalHref: hrefs.records({ ...seasonQuery(season), place: g.place.slug }),
        moreHref: `${hrefs.place(g.place.slug)}?year=${season.year}#year-view`,
        speciesHref: (s) => hrefs.records({ ...seasonQuery(season), place: g.place.slug, species: s.slug }),
      }))}
    />
  );
}
