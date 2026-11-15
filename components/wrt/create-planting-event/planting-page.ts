/**
 * Where you are on the planting event page, as one state: what's over the panel's own page, the past season
 * open, whether the form is open, and where the phone sheet sits. Each way of moving about is one action.
 *
 * `over` is a back stack of what covers the page, newest last: the site list, an area's sheet, or the cross on
 * the map. Each keeps what its Back or Cancel puts back (the list, where the sheet was; the cross, the sheet and
 * the season it closed), so closing one is a pop. Only the cross goes over another (the list, which its Cancel
 * brings back). Starting most things clears the stack.
 *
 * The season, the form (`started`) and what Cancel on a new location puts back (`spotFrom`) aren't on the stack:
 * they outlive what's over them. A season stays open, hidden, under the list or an area's sheet, so an edit in it
 * survives; the form and its entries stay through the list and back.
 */
import type { Snap } from "@/components/wrt/shared/form-panel";
import type { LngLat } from "./map/sites";

/** A past season opened at the site. `wholeSite` when the part had none, so the whole site's were listed. */
export type Season = { slug: string; label: string; wholeSite: boolean };
/**
 * "new": dropping a new location. "site": a new site, whatever is near. "part": a sublocation of `partOf`.
 * "spot": moving the new location already dropped. "move": moving the chosen site's pin, which is in the wrong spot.
 */
export type CrossMode = "new" | "site" | "part" | "spot" | "move";
export type Cross = {
  kind: "placing"; mode: CrossMode; partOf: string;
  /** What the hint measures from: the pins of the site it's for, and its name. */
  from: { pins: LngLat[]; label: string } | null;
  /** Where you were when it came up: Cancel goes back there. */
  snap: Snap; season: Season | null;
};
export type Over = { kind: "list"; snap: Snap } | { kind: "area"; id: number } | Cross;

export interface PageState {
  over: Over[];
  season: Season | null;
  /** The form is open (or its entries kept, under the list or the cross). */
  started: boolean;
  /** "Add new planting event" from a past season: the form's Back (and the browser's) opens it again (at the same site and part). */
  startedFrom: { season: Season; site: string; part: string | null } | null;
  /** Where you were before a new location was dropped (its Cancel). */
  spotFrom: { started: boolean; slug: string; part: string | null; season: Season | null };
  /** That Cancel's season, waiting for the form to be back at its site and part (any other change of place closes a season). */
  restore: { slug: string; part: string | null; season: Season } | null;
  snap: Snap;
  /** Phones' Search: the site list with its search box focused (each tap asks again). */
  searchAsk: number;
}

// Phones start with the sheet at its bar, so the map shows first; a season from the address opens full screen, as one opened here does.
export const initialPage = (season: Season | null): PageState => ({
  over: [], season, started: false, startedFrom: null,
  spotFrom: { started: false, slug: "", part: null, season: null }, restore: null, snap: season ? "full" : "peek", searchAsk: 0,
});

export type PageAction =
  | { type: "snap"; to: Snap }
  | { type: "openList"; wide: boolean }
  | { type: "closeList"; wide: boolean; back: boolean }
  | { type: "search"; wide: boolean; allSites: boolean }
  | { type: "showChoice"; wide: boolean }
  | { type: "openArea"; id: number; wide: boolean }
  | { type: "closeArea" }
  | { type: "closeOver" }
  | { type: "endModes"; snap: Snap }
  | { type: "openSeason"; season: Season; wide: boolean }
  | { type: "closeSeason" }
  | { type: "showSite"; wide: boolean }
  | { type: "startForm"; from: PageState["startedFrom"] }
  | { type: "plantArea" }
  | { type: "keepArea"; wide: boolean; full: boolean; list: boolean }
  | { type: "newEvent" }
  | { type: "afterSave" }
  | { type: "formBack"; season: Season | null; wide: boolean }
  | { type: "leave" }
  | { type: "cancelSpot"; back: boolean }
  | { type: "placeChanged"; slug: string; part: string | null; changed: boolean }
  | { type: "startCross"; mode: CrossMode; partOf: string; from: Cross["from"] }
  | { type: "cancelCross" }
  | { type: "endCross" }
  | { type: "drop"; hasSpot: boolean; slug: string; part: string | null; toList: boolean; wide: boolean };

export const topOf = (s: PageState) => s.over[s.over.length - 1];

// The site list over the page. On phones the sheet goes full screen for it; already open, it keeps where the sheet was before.
function openList(s: PageState, wide: boolean): PageState {
  const top = topOf(s);
  return { ...s, over: [top?.kind === "list" ? top : { kind: "list", snap: s.snap }], searchAsk: 0, snap: wide ? s.snap : "full" };
}
// After a choice the sheet comes back to at least half way (to show it); closed without one (`back`), exactly where it was.
function closeList(s: PageState, wide: boolean, back: boolean): PageState {
  const top = topOf(s);
  if (top?.kind !== "list") return { ...s, searchAsk: 0 };
  return { ...s, over: s.over.slice(0, -1), searchAsk: 0, snap: wide ? s.snap : !back && top.snap === "peek" ? "mid" : top.snap };
}
// A season takes the panel's place; anything over the page goes.
const openSeason = (s: PageState, season: Season, wide: boolean): PageState => ({ ...s, over: [], season, snap: wide ? s.snap : "full" });

export function pageReducer(s: PageState, a: PageAction): PageState {
  const top = topOf(s);
  switch (a.type) {
    case "snap": return { ...s, snap: a.to };
    case "openList": return openList(s, a.wide);
    case "closeList": return closeList(s, a.wide, a.back);
    // With no site the list is the panel already: raised for the search.
    case "search": {
      const n = !(top?.kind === "list") && !a.allSites ? openList(s, a.wide) : { ...s, snap: a.wide ? s.snap : "full" };
      return { ...n, searchAsk: n.searchAsk + 1 };
    }
    // A site chosen: from the list, back to where it was opened from. Otherwise (a pin, the question) half way, to show the choice.
    case "showChoice": return top?.kind === "list" ? closeList(s, a.wide, false) : { ...s, snap: a.wide ? s.snap : "mid" };
    case "openArea": return { ...s, over: [{ kind: "area", id: a.id }], snap: a.wide ? s.snap : "mid" };
    case "closeArea": return top?.kind === "area" ? { ...s, over: s.over.slice(0, -1) } : s;
    case "closeOver": return { ...s, over: [] };
    // Starting one thing ends the others: the cross, the site list, an area's sheet and an open season.
    case "endModes": return { ...s, over: [], season: null, snap: a.snap };
    case "openSeason": return openSeason(s, a.season, a.wide);
    case "closeSeason": return { ...s, season: null };
    // Up to the site as a whole: the list closes as its Back does, and the season goes.
    case "showSite": return { ...(top?.kind === "list" ? closeList(s, a.wide, true) : s), over: [], season: null };
    case "startForm": return { ...s, over: [], season: null, started: true, startedFrom: a.from };
    case "plantArea": return { ...s, over: [], season: null, started: true, snap: "full" };
    case "keepArea": {
      const n = a.list ? openList(s, a.wide) : s;
      return { ...n, started: true, snap: a.full ? "full" : n.snap };
    }
    case "newEvent": return { ...s, started: true, startedFrom: null };
    case "afterSave": return { ...s, started: false, startedFrom: null };
    case "formBack": {
      const n = { ...s, started: false, startedFrom: null };
      return a.season ? openSeason(n, a.season, a.wide) : n;
    }
    case "leave": return { ...s, over: [], season: null, searchAsk: 0, started: false, startedFrom: null, snap: "mid" };
    // `back`: the site or part goes back too, so the season waits for the form to get there (see placeChanged).
    case "cancelSpot": {
      const { started, season, slug, part } = s.spotFrom;
      if (a.back && season) return { ...s, started, restore: { slug, part, season } };
      return { ...s, started, season: season ?? s.season };
    }
    // The form's site or part: a change closes an open season, unless it's the one a Cancel is waiting for.
    case "placeChanged": {
      const r = s.restore;
      if (r && r.slug === a.slug && r.part === a.part) return { ...s, season: r.season, restore: null };
      return a.changed ? { ...s, season: null, restore: null } : s;
    }
    // Already placing, the cross keeps where you were before it (and the list under it).
    case "startCross": {
      const placing = top?.kind === "placing" ? top : undefined;
      const under = top?.kind === "list" ? [top] : placing ? s.over.slice(0, -1) : [];
      const cross: Cross = { kind: "placing", mode: a.mode, partOf: a.partOf, from: a.from, snap: placing?.snap ?? s.snap, season: placing ? placing.season : s.season };
      return { ...s, over: [...under, cross], season: null, snap: "peek" };
    }
    case "cancelCross":
      if (top?.kind !== "placing") return s;
      return { ...s, over: s.over.slice(0, -1), snap: top.snap, season: top.season ?? s.season };
    // The site's pin moved: up again, to see it.
    case "endCross": return { ...s, over: top?.kind === "placing" ? [] : s.over, snap: "mid" };
    case "drop": {
      if (top?.kind !== "placing") return s;
      // The new location moved: nothing else changes.
      if (top.mode === "spot") return { ...s, over: [], snap: top.snap };
      const spotFrom = a.hasSpot ? s.spotFrom : { started: s.started, slug: a.slug, part: a.part, season: top.season };
      // Up again, to name it; not at a known site, the list says which it belongs to.
      if (a.toList) return { ...s, over: [{ kind: "list", snap: s.snap }], searchAsk: 0, spotFrom, started: true, snap: a.wide ? "mid" : "full" };
      return { ...s, over: [], spotFrom, started: true, snap: "mid" };
    }
  }
}
