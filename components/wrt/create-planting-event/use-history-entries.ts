import { useCallback, useEffect, useRef, useState } from "react";

/** What one of our history entries is for: an open season (the browser's back closes it), or unsaved work (back asks first). */
export type EntryKind = "season" | "guard";

/**
 * Our history entries over the page's own, so the browser's back does what the page's Back does.
 * Each entry carries its depth (`wrtDepth`), so a popstate says how far it went: back pops ours and
 * hands each to `onBack`, forward is undone (what it would bring back is gone). An entry dropped while
 * another is over it can't be taken out of the browser's history, so it's skipped when back reaches it.
 *
 * Next.js keeps its own router state in each entry: pushState and replaceState without a URL keep it,
 * and a popstate between two entries holding the same router state restores nothing from the server.
 */
/** `onBack` gets each of ours the browser's back popped; true when it did something (it may push the entry back first). */
export function useHistoryEntries(onBack: (kind: EntryKind, again: { push: (kind: EntryKind) => void; leave: () => void; has: (kind: EntryKind) => boolean }) => boolean) {
  const entries = useRef<(EntryKind | "dead")[]>([]);
  // Backs asked for and not yet landed, and pushes waiting on them (pushed before the back lands, it would be the one popped).
  const backs = useRef(0);
  const queued = useRef<EntryKind[]>([]);
  const handler = useRef(onBack);
  useEffect(() => { handler.current = onBack; });
  // Bumped by every popstate of ours, so the host writes the address again for what's showing.
  const [popped, setPopped] = useState(0);

  // Whether the tab had a page before ours when it opened: without one, a back from our own entry goes nowhere.
  const pageBefore = useRef(true);
  // A back that never lands (out of range, or the browser drops it) mustn't hold everything up: after a while, carry on.
  const stuck = useRef<number | undefined>(undefined);
  const settle = useRef<() => void>(() => {});
  const back = useCallback((by = 1) => {
    backs.current++;
    window.clearTimeout(stuck.current);
    stuck.current = window.setTimeout(() => settle.current(), 1000);
    window.history.go(-by);
  }, []);
  const push = useCallback((kind: EntryKind) => {
    if (backs.current) return void queued.current.push(kind);
    entries.current.push(kind);
    window.history.pushState({ ...window.history.state, wrtDepth: entries.current.length }, "");
  }, []);
  const drop = useCallback((kind: EntryKind) => {
    const list = entries.current;
    const i = list.lastIndexOf(kind);
    if (i < 0) return;
    if (i === list.length - 1 && !backs.current) {
      list.pop();
      back();
    } else list[i] = "dead";
  }, [back]);
  const has = useCallback((kind: EntryKind) => entries.current.includes(kind), []);
  /** Off the page altogether: past all of ours, to the page before. */
  const leave = useCallback(() => {
    const by = entries.current.length + 1;
    entries.current = [];
    back(by);
  }, [back]);
  /** Back to the page's own entry (past all of ours), then `then` (e.g. replace it with another page). */
  const landed = useRef<(() => void) | null>(null);
  const home = useCallback((then: () => void) => {
    const by = entries.current.length;
    entries.current = [];
    // A back already on its way (e.g. a season just closed) lands on the page's entry too: wait for it, or it undoes `then`.
    if (!by && !backs.current) return then();
    landed.current = then;
    if (by) back(by);
  }, [back]);
  /** How many of ours are under the current entry, for the address's replaceState; null while a back is landing. */
  const depth = useCallback(() => (backs.current ? null : entries.current.length), []);

  // The page's own entry is depth 0, so a back to it is one of ours. (Before the host's effects, which may push.)
  // Keeps the state already there: this can run before Next patches history, and an entry without its router state makes Next reload the page on back.
  useEffect(() => {
    pageBefore.current = window.history.length > 1;
    window.history.replaceState({ ...window.history.state, wrtDepth: 0 }, "");
    return () => window.clearTimeout(stuck.current);
  }, []);
  useEffect(() => {
    function onPop(e: PopStateEvent) {
      const d = (e.state as { wrtDepth?: unknown } | null)?.wrtDepth;
      if (typeof d !== "number") return; // another page's entry
      if (backs.current) backs.current--;
      if (!backs.current) window.clearTimeout(stuck.current);
      if (landed.current && d === 0) {
        const then = landed.current;
        landed.current = null;
        // After Next's own popstate (its listener runs after ours): run now and its restore of this entry wins.
        return void window.setTimeout(then, 0);
      }
      const list = entries.current;
      if (d > list.length) {
        back(d - list.length);
      } else {
        const gone = list.splice(d).reverse();
        // Only skipped entries (or nothing left to keep): back again, as if they weren't there.
        // At the page's own entry with no page before it, there's nowhere further to go.
        const handled = gone.some((kind) => kind !== "dead" && handler.current(kind, { push, leave, has }));
        if (gone.length && !handled && (d > 0 || pageBefore.current)) back();
      }
      flush();
    }
    // Backs settled (landed, or given up on): pushes that waited go in, and the host writes the address again.
    function flush() {
      if (!backs.current) for (const kind of queued.current.splice(0)) push(kind);
      setPopped((n) => n + 1);
    }
    settle.current = () => {
      backs.current = 0;
      const then = landed.current;
      landed.current = null;
      if (then) return then();
      flush();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [back, push, leave, has]);

  return { push, drop, has, leave, home, depth, popped };
}
