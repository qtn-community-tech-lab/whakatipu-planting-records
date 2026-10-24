import Image from "next/image";
import type { Species } from "@/lib/wrt/types";

/** Small round picture for a species in a ranked list: its photo, or its initial. */
export function SpeciesAvatar({ species }: { species: Species }) {
  const initial = (species.displayIsScientific ? species.scientificName : species.displayName).charAt(0).toUpperCase();
  return (
    <span className="wrt-avatar" aria-hidden="true">
      {species.imageUrl ? (
        <Image src={species.imageUrl} width={80} height={80} alt="" sizes="40px" unoptimized />
      ) : (
        <span className="wrt-avatar__initial">{initial}</span>
      )}
    </span>
  );
}

/** Leaderboard label: rank chip in front of whatever names the row. */
export function RankLabel({ rank, children }: { rank: number; children: React.ReactNode }) {
  return (
    <span className="wrt-lb">
      <span className="wrt-lb__rank" data-top={rank <= 3 || undefined}>{rank}</span>
      {children}
    </span>
  );
}
