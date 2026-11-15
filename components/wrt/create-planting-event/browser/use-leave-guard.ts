"use client";
/**
 * Leaving unsaved work asks first: a new event's entries.
 * The page's own ways out ask with a dialog; the browser's back does too (through our history entries), and
 * closing or reloading the tab lets the browser ask.
 */
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import { useHistoryEntries } from "./use-history-entries";

export function useLeaveGuard({ guarded, saving, exitHref }: {
  /** Unsaved work now: a new event's entries. */
  guarded: boolean;
  /** A new event saving: the browser's back waits. */
  saving: boolean;
  exitHref: Route;
}) {
  // Leaving unsaved work asks first: where it goes (for the dialog), and how.
  const [leaving, setLeaving] = useState<{ to: string; run: () => void } | null>(null);
  // The browser's back: unsaved work has a guard entry (back asks first, as the page's ← does). See use-history-entries.ts.
  // Leaving agreed to, so the browser doesn't ask again.
  const exiting = useRef(false);
  // The tab had no page before this one: leaving goes to the sites list instead of back past it.
  const firstEntry = useRef(false);
  useEffect(() => { firstEntry.current = window.history.length <= 1; }, []);
  // Leaving with the browser's back: if it doesn't get off the page (nothing before it after all), the sites list.
  // Not once the page has gone (pagehide: off to another document, or into the back-forward cache).
  const leaveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const clear = () => window.clearTimeout(leaveTimer.current);
    window.addEventListener("pagehide", clear);
    return () => { clear(); window.removeEventListener("pagehide", clear); };
  }, []);
  // A new callback each render, so it always sees the page as it is now.
  const { push: pushEntry, drop: dropEntry, has: hasEntry, home: toPageEntry, depth, popped } = useHistoryEntries((kind, again) => {
    // A new event saving: not now (the entry goes back).
    if (saving) { again.push(kind); return true; }
    if (!guarded) return false; // nothing to keep now: on out of the page
    again.push("guard");
    setLeaving({
      to: "the page before",
      run: () => {
        exiting.current = true;
        if (firstEntry.current) return window.location.replace(exitHref);
        again.leave();
        const here = window.location.pathname;
        leaveTimer.current = window.setTimeout(() => {
          if (document.visibilityState === "visible" && window.location.pathname === here) window.location.replace(exitHref);
        }, 600);
      },
    });
    return true;
  });
  // The guard entry is there while there's unsaved work.
  useEffect(() => {
    if (!guarded) dropEntry("guard");
    else if (!hasEntry("guard")) pushEntry("guard");
  }, [guarded, dropEntry, hasEntry, pushEntry]);
  // Closing or reloading the tab with unsaved work: the browser asks. Not once leaving was agreed to.
  useEffect(() => {
    if (!guarded) return;
    const ask = (e: BeforeUnloadEvent) => { if (!exiting.current) e.preventDefault(); };
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [guarded]);

  function unlessUnsaved(to: string, run: () => void) {
    if (saving) return; // mid-save: it finishes first
    if (guarded) setLeaving({ to, run });
    else run();
  }
  // Off the map (Back from every site): asks first like the rest.
  // Back to the page's own entry first (past ours), then replace it: back from the sites list then goes to the page before this one.
  const exit = () => unlessUnsaved("the sites list", () => { exiting.current = true; toPageEntry(() => window.location.replace(exitHref)); });

  return { leaving, setLeaving, unlessUnsaved, exit, depth, popped };
}
