/**
 * What the planting-event form needs from the historical data: the site list
 * (with parts) and the species register, trimmed to client-safe fields.
 *
 * Species and parcel ids travel to the browser only as form VALUES (join
 * keys); every label shown is a name, as everywhere else in the app.
 */
import "server-only";
import { getWrtAll } from "../server";
import { searchKey } from "../text";
import type { EventLookups } from "./validate";

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
 * Uses getWrtAll(), not getWrt(): which sites and species exist must not
 * depend on the reader's "show records needing review" switch.
 */
export async function eventFormOptions(): Promise<EventFormOptions> {
  const { places, species } = await getWrtAll().lookups();
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

/** The reference data validateEventInput checks against (same source as the form). */
export async function eventLookups(): Promise<EventLookups> {
  const { places, species } = await getWrtAll().lookups();
  return { places, species };
}
