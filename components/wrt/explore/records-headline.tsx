import type { ReactNode } from "react";
import type { Lookups, RecordFilter } from "@/lib/wrt/queries";
import type { Quantity } from "@/lib/wrt/types";
import { formatNumber } from "@/lib/wrt/text";

/**
 * The H1 as a sentence read from the filters:
 * "2,105 recorded plants at Whitechapel in 2019",
 * "44,290 recorded plants on records needing review".
 */
export function recordsHeadline(
  f: RecordFilter, split: Quantity, lookups: Lookups,
): ReactNode {
  if (split.records === 0) return "No records match these filters";

  const place = f.place ? lookups.places.find((p) => p.slug === f.place) : undefined;
  const parcel = place?.parcels.find((p) => p.slug === f.parcel);
  const species = f.species ? lookups.species.find((s) => s.slug === f.species) : undefined;
  const n = split.total;
  const noun = `recorded plant${n === 1 ? "" : "s"}`;

  const speciesText = species
    ? species.displayIsScientific ? <i>{species.displayName}</i> : species.displayName
    : null;

  let when: string | null = null;
  if (f.season && f.year) when = `${f.season} ${f.year}`;
  else if (f.year) when = String(f.year);
  else if (f.season) when = f.season;

  const none = !place && !species && !when && !f.q;

  return (
    <>
      {formatNumber(n)} {noun}
      {speciesText && <> of {speciesText}</>}
      {place && <> at {parcel ? <>{parcel.name} ({place.name})</> : place.name}</>}
      {when && <> in {when}</>}
      {f.q && <> matching “{f.q}”</>}
      {none && <> across all saved records</>}
    </>
  );
}
