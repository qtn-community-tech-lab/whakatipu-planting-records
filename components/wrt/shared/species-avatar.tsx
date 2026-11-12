import type { ReactNode } from "react";
import { PhotoMedia } from "@/components/wrt/species/photo-media";
import type { Species } from "@/lib/wrt/types";

/** Small round picture for a species in a ranked list: its photo, or its initial. */
export function SpeciesAvatar({ species }: { species: Pick<Species, "photos" | "id" | "scientificName" | "displayName" | "displayIsScientific"> }) {
  const photo = species.photos[0];
  const initial = (species.displayIsScientific ? species.scientificName : species.displayName).charAt(0).toUpperCase();
  return (
    <span className="wrt-avatar" aria-hidden="true">
      {photo ? (
        <PhotoMedia photo={photo} name={species.displayName} variant="avatar" sizes="40px" />
      ) : (
        <span className="wrt-avatar__initial">{initial}</span>
      )}
    </span>
  );
}

/** Leaderboard label: rank chip in front of whatever names the row. */
export function RankLabel({ rank, children }: { rank: number; children: ReactNode }) {
  return (
    <span className="wrt-lb">
      <span className="wrt-lb__rank" data-top={rank <= 3 || undefined}>{rank}</span>
      {children}
    </span>
  );
}
