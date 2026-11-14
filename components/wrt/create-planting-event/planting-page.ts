/**
 * Where you are on the planting event page, as one state: what's over the panel's own page, and where the
 * phone sheet sits. Each way of moving about is one action.
 *
 * `over` is a back stack of what covers the page: the site list, which keeps where the sheet was for its Back, so
 * closing it is a pop. Starting most things clears the stack.
 */
import type { Snap } from "@/components/wrt/shared/form-panel";

export type Over = { kind: "list"; snap: Snap };

export interface PageState {
  over: Over[];
  snap: Snap;
  /** Phones' Search: the site list with its search box focused (each tap asks again). */
  searchAsk: number;
}

// Phones start with the sheet at its bar, so the map shows first.
export const initialPage: PageState = { over: [], snap: "peek", searchAsk: 0 };

export type PageAction =
  | { type: "snap"; to: Snap }
  | { type: "openList"; wide: boolean }
  | { type: "closeList"; wide: boolean; back: boolean }
  | { type: "search"; wide: boolean; allSites: boolean }
  | { type: "showChoice"; wide: boolean }
  | { type: "closeOver" }
  | { type: "endModes"; snap: Snap }
  | { type: "showSite"; wide: boolean }
  | { type: "leave" };

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
    case "closeOver": return { ...s, over: [] };
    // Starting one thing ends the others: the site list.
    case "endModes": return { ...s, over: [], snap: a.snap };
    // Up to the site as a whole: the list closes as its Back does.
    case "showSite": return { ...(top?.kind === "list" ? closeList(s, a.wide, true) : s), over: [] };
    // Back to every site.
    case "leave": return { ...s, over: [], searchAsk: 0, snap: "mid" };
  }
}
