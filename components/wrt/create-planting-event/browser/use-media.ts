"use client";
import { useSyncExternalStore } from "react";

/** Whether a media query matches, kept up to date. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(query).matches,
    // Before the page knows its width: a phone, whose sheet starts hidden below the screen.
    // (Wide here drew the side panel on phones until the scripts loaded.)
    () => false,
  );
}
