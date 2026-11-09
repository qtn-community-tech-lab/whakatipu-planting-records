/**
 * What the planting-event form needs from the historical data: the site list
 * (with parts) and the species register, trimmed to client-safe fields.
 *
 * Species and parcel ids travel to the browser only as form VALUES (join
 * keys); every label shown is a name, as everywhere else in the app.
 */
import "server-only";
import { getRepository, getWrtAll } from "../server";
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
 * reader's review switch. New lines use the full active species register,
 * including entries with no planting history; history lookups keep retired ones.
 */
export async function eventFormOptions(): Promise<EventFormOptions> {
  const [{ places }, species] = await Promise.all([
    getWrtAll().lookups(),
    getRepository().listSpecies(),
  ]);
  return {
    sites: places
      .filter((p) => !p.isScheme)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        keys: p.searchKeys,
        parts: p.parcels.map((x) => ({ id: x.id, name: x.name, keys: [searchKey(x.name)] })).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    species: species
      .filter((s) => s.deactivatedAt === null)
      .map((s) => ({
        id: s.id,
        name: s.displayName,
        scientific: s.scientificName,
        isScientific: s.displayIsScientific,
        keys: s.searchKeys,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
