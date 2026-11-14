"use client";
/**
 * The address follows the site, the part and the open season, so any of them can be bookmarked. A season
 * listed for the whole site (the part had none) is bookmarked without the part, so it opens with its plantings.
 */
import { useEffect, useRef } from "react";

export function useAddressSync({ siteSlug, part, unsavedSite, keptPart, season, depth, popped, totals }: {
  siteSlug: string;
  part: string | null;
  /** The site isn't stored (a new one, or kept from earlier). */
  unsavedSite: boolean | undefined;
  keptPart: boolean;
  season: { slug: string; wholeSite: boolean } | null;
  /** How many of our history entries are under this one (see useHistoryEntries); null while a back is landing. */
  depth: () => number | null;
  popped: number;
  /** New each server render: the address is written again after a server refresh. */
  totals: unknown;
}) {
  const unsynced = useRef(false);
  const seasonSlug = season?.slug;
  const wholeSite = season?.wholeSite;
  // Plain `{ wrtDepth }` with the URL: Next's replaceState adds its own state and learns the URL. A task later,
  // so Next has patched history by then (on mount this runs first), and only when something differs. Written
  // again after a server refresh (`totals` is new each server render), which rewrites the entry at Next's URL.
  // A timer, not requestAnimationFrame: frames don't run in a background tab, and the address must still follow.
  useEffect(() => {
    const id = setTimeout(() => {
      const d = depth();
      if (d === null) return; // a back is landing: written again once it has (popped)
      const q = new URLSearchParams(window.location.search);
      // Places kept on the map aren't stored, so they aren't bookmarked.
      const shownPart = wholeSite || keptPart ? null : part;
      for (const [key, value] of [["site", unsavedSite ? "" : siteSlug], ["part", shownPart], ["season", seasonSlug]] as const) if (value) q.set(key, value); else q.delete(key);
      const url = `${window.location.pathname}${q.size ? `?${q}` : ""}`;
      if (url === `${window.location.pathname}${window.location.search}` && (window.history.state as { wrtDepth?: unknown } | null)?.wrtDepth === d) return;
      // In a background tab, keep Next's state and leave its router alone: a router update there starts a view
      // transition (the layout's ViewTransition), which a hidden document aborts with an error. Told once it shows.
      if (document.hidden) {
        unsynced.current = true;
        return window.history.replaceState({ ...window.history.state, wrtDepth: d }, "", url);
      }
      window.history.replaceState({ wrtDepth: d }, "", url);
    });
    return () => clearTimeout(id);
  }, [siteSlug, part, unsavedSite, keptPart, seasonSlug, wholeSite, popped, depth, totals]);
  useEffect(() => {
    const show = () => {
      if (document.hidden || !unsynced.current) return;
      unsynced.current = false;
      const { wrtDepth } = (window.history.state ?? {}) as { wrtDepth?: number };
      window.history.replaceState({ wrtDepth }, "", `${window.location.pathname}${window.location.search}`);
    };
    document.addEventListener("visibilitychange", show);
    return () => document.removeEventListener("visibilitychange", show);
  }, []);
}
