import { useEffect, type RefObject } from "react";

/** How far the list must move one way before the bar reacts, in px: a finger's wobble isn't a scroll. */
const NUDGE = 8;

/** How long after the bar moves to ignore the list: its room changing nudges the list's scroll by itself, in ms. */
const SETTLE = 320;

/**
 * Marks `bar` with data-away while `list` is being scrolled down, and clears it on the way back up
 * or near the top; the bar's CSS decides what that looks like. Writes the bar's height to
 * --bar-height first, so the CSS can give its room to the list. Off when `on` is false.
 */
export function useHideOnScroll(list: RefObject<HTMLElement | null>, bar: RefObject<HTMLElement | null>, on: boolean) {
  useEffect(() => {
    const el = list.current;
    const foot = bar.current;
    if (!on || !el || !foot) return;
    let last = el.scrollTop;
    let quietUntil = 0;
    const set = (away: boolean) => {
      if (away === foot.hasAttribute("data-away")) return;
      if (away) foot.style.setProperty("--bar-height", `${foot.offsetHeight}px`);
      foot.toggleAttribute("data-away", away);
      quietUntil = performance.now() + SETTLE;
    };
    const onScroll = () => {
      const y = el.scrollTop;
      if (performance.now() < quietUntil) { last = y; return; }
      if (y <= 40) set(false);
      else if (Math.abs(y - last) < NUDGE) return;
      else set(y > last);
      last = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      foot.removeAttribute("data-away");
    };
  }, [list, bar, on]);
}
