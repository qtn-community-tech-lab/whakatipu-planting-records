/**
 * What the planting-event form needs from the historical data: the site list
 * (with parts) and the species register, trimmed to client-safe fields.
 *
 * Species and parcel ids travel to the browser only as form VALUES (join
 * keys); every label shown is a name, as everywhere else in the app.
 */
import "server-only";
import { listSites } from "@/db/queries/sites";
import { listSpeciesForPlanting } from "@/db/queries/species";
import { getWrtAll } from "../server";
import { searchKey } from "../text";

/** Macron-free search keys, matched with rankMatches in the browser. */
type SearchKeys = { keys: string[] };

export interface SitePartOption extends SearchKeys {
  id: string;
  name: string;
}

export interface SiteOption extends SearchKeys {
  slug: string;
  name: string;
  parts: SitePartOption[];
}

export interface SpeciesOption extends SearchKeys {
  id: string;
  /** Display name (Māori, common, then scientific), with macrons. */
  name: string;
  scientific: string;
  isScientific: boolean;
}

export interface EventFormOptions {
  sites: SiteOption[];
  species: SpeciesOption[];
}

/**
 * Uses unscoped data: available sites and species must not depend on the
 * reader's review switch. New events use active sites and species,
 * including entries with no planting history; historical lookups retain deactivated ones.
 */
export async function eventFormOptions(): Promise<EventFormOptions> {
  const [{ places }, species, sites] = await Promise.all([
    getWrtAll().lookups(),
    listSpeciesForPlanting(),
    listSites(),
  ]);
  const activeSites = new Set(sites.map((site) => site.slug));
  return {
    sites: places
      .filter((p) => !p.isScheme && activeSites.has(p.slug))
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        keys: p.searchKeys,
        parts: p.parcels
          .filter((x) => !x.deactivatedAt)
          .map((x) => ({ id: x.id, name: x.name, keys: [searchKey(x.name)] }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    species: species
      .map((s) => {
        const name = s.maori_name ?? s.common_name ?? s.scientific_name;
        const keys = [s.scientific_name, s.suggested_spelling, s.common_name, s.maori_name]
          .filter((value): value is string => !!value)
          .map(searchKey);
        return {
          id: s.register_code ?? s.slug,
          name,
          scientific: s.scientific_name,
          isScientific: name === s.scientific_name,
          keys: [...new Set(keys)],
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
