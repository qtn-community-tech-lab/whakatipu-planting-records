/**
 * Small pieces shared by the species list and species page: quiet markers,
 * the mid-sentence name, and the sort/filter vocabulary.
 */
import type { ReactNode } from "react";
import type { Species } from "@/lib/wrt/types";
import { Badge } from "@/components/ui/badge";
import { ThreatenedBadge, threatenedState } from "@/components/wrt/shared/names";

/** Proper nouns that keep their capital when a name sits mid-sentence. */
const KEEP_CAPITAL = [/^Hall/, /^Coronation/, /^Hector/];

/** "Kōwhai" → "kōwhai" for use inside a sentence. Never drops macrons. */
export function midSentence(name: string): string {
  if (KEEP_CAPITAL.some((re) => re.test(name))) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** Name for use inside a sentence: lower-case, or italic when it is the botanical name. */
export function InlineName({ species }: { species: Species }): ReactNode {
  return species.displayIsScientific ? (
    <i>{species.scientificName}</i>
  ) : (
    midSentence(species.displayName)
  );
}

/** Quiet markers. Each says the consequence, not a code. */
export function SpeciesMarkers({ species }: { species: Species }) {
  if (!species.over5m && !threatenedState(species)) return null;
  return (
    <span className="wrt-pills">
      {species.over5m === true && <Badge tone="soft">Over 5 m</Badge>}
      <ThreatenedBadge species={species} />
    </span>
  );
}

export const SORTS = [
  { key: "plants", label: "Most recorded plants" },
  { key: "sites", label: "Most sites" },
  { key: "name", label: "A–Z by common name" },
  { key: "botanical", label: "A–Z by botanical name" },
] as const;
export type SortKey = (typeof SORTS)[number]["key"];

export const SHOWS = [
  { key: "all", label: "All species" },
  { key: "over5m", label: "Over 5 m" },
  { key: "threatened", label: "Marked threatened" },
] as const;
export type ShowKey = (typeof SHOWS)[number]["key"];
