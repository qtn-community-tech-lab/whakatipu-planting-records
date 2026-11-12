"use client";
/**
 * Site pins moved because they were in the wrong spot. Not saved yet: a reload puts them back.
 * Moves are keyed by the pin's place (its site, and part or none), so two pins on the same spot move apart.
 */
import { useCallback, useMemo, useState } from "react";
import { pinOf, type LngLat, type SitePin } from "./sites";

const keyOf = (p: SitePin) => `${p.slug}/${p.parcelId ?? ""}`;

export function usePinMoves(basePins: SitePin[]) {
  const [moved, setMoved] = useState<Record<string, LngLat>>({});
  const pins = useMemo(() => basePins.map((p) => { const to = moved[keyOf(p)]; return to ? { ...p, at: to } : p; }), [basePins, moved]);

  /** Where a site's (or part's) pin is now, moved or not. */
  const pinAt = useCallback((slug: string, parcelId: string | null) => {
    const pin = pinOf(basePins, slug, parcelId);
    return pin ? moved[keyOf(pin)] ?? pin.at : null;
  }, [basePins, moved]);

  const isMoved = (slug: string, parcelId: string | null) => {
    const pin = pinOf(basePins, slug, parcelId);
    return !!pin && !!moved[keyOf(pin)];
  };

  /** Move a site's (or part's) pin to `to`, or put it back with null. */
  const move = (slug: string, parcelId: string | null, to: LngLat | null) => {
    const pin = pinOf(basePins, slug, parcelId);
    const key = pin && keyOf(pin);
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
