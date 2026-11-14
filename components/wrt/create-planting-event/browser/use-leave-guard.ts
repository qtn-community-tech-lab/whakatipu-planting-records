"use client";
/**
 * Leaving unsaved work asks first: a new event's entries, and a past planting's edit.
 * The page's own ways out ask with a dialog; the browser's back does too (through our history entries), and
 * closing or reloading the tab lets the browser ask.
 */
import type { Route } from "next";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHistoryEntries } from "./use-history-entries";

export function useLeaveGuard({ guarded, saving, exitHref, seasonOpen, formFromSeason, formBack, closeSeason }: {
  /** Unsaved work now: a new event's entries. */
  guarded: boolean;
  /** A new event saving: the browser's back waits. */
  saving: boolean;
  exitHref: Route;
  /** A season is open, or the form opened from one: it has its own history entry. */
  seasonOpen: boolean;
  /** The form is open from a season ("Add new planting event"), with the season itself closed. */
  formFromSeason: boolean;
  /** The form's Back: true when the season opened again. */
  formBack: () => boolean;
  closeSeason: () => void;
}) {
  // Leaving unsaved work asks first: where it goes (for the dialog), and how.
  const [leaving, setLeaving] = useState<{ to: string; run: () => void } | null>(null);
  // A past planting being edited with changes not saved yet: anything that would close its season asks first.
  // Saving, the browser's back waits (the save's own dialog is up).
  const editDirty = useRef(false);
  const editSaving = useRef(false);
  const [editing, setEditing] = useState(false);
  // A save of the edit was tried and it's still open: part of it may be saved (Discard says so).
  const [editTried, setEditTried] = useState(false);
  const onEditDirty = useCallback((dirty: boolean) => { editDirty.current = dirty; setEditing(dirty); if (!dirty) setEditTried(false); }, []);
  const onEditSaving = useCallback((saving: boolean) => { editSaving.current = saving; if (saving) setEditTried(true); }, []);
  const [discard, setDiscard] = useState<{ run: () => void } | null>(null);
  // Discard remounts the season, so the editor that had the changes goes too.
  const [seasonKey, setSeasonKey] = useState(0);
  function unlessEditing(run: () => void) {
    if (editDirty.current) setDiscard({ run });
    else run();
  }
  function discardEdit() {
    const run = discard?.run;
    onEditDirty(false);
    setDiscard(null);
    setSeasonKey((k) => k + 1);
    run?.();
  }
  // The browser's back: an open season has its own entry (back closes it, as Back does), and unsaved work
  // a guard entry (back asks first, as the page's ← does). See use-history-entries.ts.
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
    if (kind === "season") {
      // The form opened from a season ("Add new planting event"): back is the form's Back, to the season.
      if (formFromSeason) {
        if (formBack()) again.push("season");
        return true;
      }
      if (editSaving.current || editDirty.current) {
        again.push("season");
        if (!editSaving.current) setDiscard({ run: closeSeason });
      } else closeSeason();
      return true;
    }
    // Over a season's entry (the form opened from it): that one goes first; the guard comes back over it after.
    if (again.has("season")) return false;
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
  // Every way a season closes (Back, leaving the site, another part, starting something else) drops its entry.
  useEffect(() => {
    if (!seasonOpen) dropEntry("season");
    else if (!hasEntry("season")) pushEntry("season");
  }, [seasonOpen, dropEntry, hasEntry, pushEntry]);
  // Again after each back (`popped`): one that passed a guard on to the season's entry under it puts the guard back.
  useEffect(() => {
    if (!guarded) dropEntry("guard");
    else if (!hasEntry("guard")) pushEntry("guard");
  }, [guarded, popped, dropEntry, hasEntry, pushEntry]);
  // Closing or reloading the tab with unsaved work: the browser asks. Not once leaving was agreed to.
  useEffect(() => {
    if (!guarded && !editing) return;
    const ask = (e: BeforeUnloadEvent) => { if (!exiting.current) e.preventDefault(); };
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [guarded, editing]);

  function unlessUnsaved(to: string, run: () => void) {
    if (saving) return; // mid-save: it finishes first
    unlessEditing(() => (guarded ? setLeaving({ to, run }) : run()));
  }
  // Off the map (Back from every site): asks first like the rest.
  // Back to the page's own entry first (past ours), then replace it: back from the sites list then goes to the page before this one.
  const exit = () => unlessUnsaved("the sites list", () => { exiting.current = true; toPageEntry(() => window.location.replace(exitHref)); });

  return {
    leaving, setLeaving, discard, setDiscard, discardEdit, editTried, seasonKey, onEditDirty, onEditSaving,
    unlessEditing, unlessUnsaved, exit, depth, popped,
  };
}
