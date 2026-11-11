"use client";
/**
 * Site pins moved because they were in the wrong place. Not saved yet: a reload puts them back.
 * Moves are keyed by where the pin was ("lng,lat"), so a site's and a part's pin move apart.
 */
import { useCallback, useMemo, useState } from "react";
import { pinFor, type LngLat, type SitePin } from "./sites";

export function usePinMoves(basePins: SitePin[]) {
  const [moved, setMoved] = useState<Record<string, LngLat>>({});
  const pins = useMemo(() => basePins.map((p) => (moved[p.at.join()] ? { ...p, at: moved[p.at.join()] } : p)), [basePins, moved]);

  /** Where a site's (or part's) pin is now, moved or not. */
  const pinAt = useCallback((slug: string, parcelId: string | null) => {
    const at = pinFor(basePins, slug, parcelId);
    return at && (moved[at.join()] ?? at);
  }, [basePins, moved]);

  const isMoved = (slug: string, parcelId: string | null) => {
    const at = pinFor(basePins, slug, parcelId);
    return !!at && !!moved[at.join()];
  };

  /** Move a site's (or part's) pin to `to`, or put it back with null. */
  const move = (slug: string, parcelId: string | null, to: LngLat | null) => {
    const key = pinFor(basePins, slug, parcelId)?.join();
    if (!key) return;
    setMoved((m) => {
      const next = { ...m };
      if (to) next[key] = to;
      else delete next[key];
      return next;
    });
  };

  return { pins, pinAt, isMoved, move };
}
