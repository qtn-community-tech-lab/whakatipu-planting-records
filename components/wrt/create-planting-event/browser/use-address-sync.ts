"use client";
/**
 * The address follows the site and the part, so either can be bookmarked.
 */
import { useEffect, useRef } from "react";

export function useAddressSync({ siteSlug, part }: {
  siteSlug: string;
  part: string | null;
}) {
  const unsynced = useRef(false);
  // No state with the URL: Next's replaceState adds its own and learns the URL. A task later, so Next has
  // patched history by then (on mount this runs first), and only when something differs.
  // A timer, not requestAnimationFrame: frames don't run in a background tab, and the address must still follow.
  useEffect(() => {
    const id = setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      for (const [key, value] of [["site", siteSlug], ["part", part]] as const) if (value) q.set(key, value); else q.delete(key);
      const url = `${window.location.pathname}${q.size ? `?${q}` : ""}`;
      if (url === `${window.location.pathname}${window.location.search}`) return;
      // In a background tab, keep Next's state and leave its router alone: a router update there starts a view
      // transition (the layout's ViewTransition), which a hidden document aborts with an error. Told once it shows.
      if (document.hidden) {
        unsynced.current = true;
        return window.history.replaceState(window.history.state, "", url);
      }
      window.history.replaceState(null, "", url);
    });
    return () => clearTimeout(id);
  }, [siteSlug, part]);
  useEffect(() => {
    const show = () => {
      if (document.hidden || !unsynced.current) return;
      unsynced.current = false;
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    };
    document.addEventListener("visibilitychange", show);
    return () => document.removeEventListener("visibilitychange", show);
  }, []);
}
