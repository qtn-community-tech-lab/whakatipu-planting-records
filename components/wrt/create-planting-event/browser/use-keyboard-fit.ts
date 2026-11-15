"use client";
/**
 * Phones: when the keyboard opens, the full-screen element (sized by --keyboard-top and --keyboard-height) shrinks
 * to the part of the page still showing (iOS covers the page instead of shrinking it, and slides it up), so the
 * form's footer sits above the keyboard. The page is also marked `data-keyboard`, so the sheet and the form can
 * fold away what isn't needed while typing.
 */
import { useEffect } from "react";

/** The visible page this much shorter than it has been means the keyboard is up. */
const KEYBOARD_PX = 120;

export function useKeyboardFit(el: HTMLElement | null) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!el || !vv) return;
    const root = document.documentElement;
    const page = root.style;
    // The tallest the visible page has been at this width. Android shrinks the window itself for
    // the keyboard, so the window's height is no guide; the browser's own bars move it far less
    // than a keyboard does.
    let width = 0, tallest = 0, up = false, timer = 0;
    const field = () => {
      const a = document.activeElement;
      return a instanceof HTMLElement && el.contains(a) && a.matches("input, textarea") ? a : null;
    };
    const centre = (wait: number) => {
      clearTimeout(timer);
      timer = window.setTimeout(() => { const f = field(); if (f) centreInList(f); }, wait);
    };
    const fit = () => {
      if (vv.scale > 1.01) return; // pinch-zoomed, the visible page is small too: leave that alone
      if (vv.width !== width) { width = vv.width; tallest = 0; }
      tallest = Math.max(tallest, vv.height, window.innerHeight); // iOS keeps the window's height under the keyboard
      // It comes up only with a field focused (nothing else that shrinks the page is a keyboard),
      // and goes when the page grows back, not when the field loses focus: a tap on a button
      // must find the button where it was.
      const keyboard = tallest - vv.height > KEYBOARD_PX && (up || !!field());
      if (keyboard) {
        page.setProperty("--keyboard-top", `${vv.offsetTop}px`);
        page.setProperty("--keyboard-height", `${vv.height}px`);
        root.dataset.keyboard = "";
        centre(up ? 0 : 60); // once the sheet has resized
      } else clear();
      up = keyboard;
    };
    const clear = () => {
      page.removeProperty("--keyboard-top");
      page.removeProperty("--keyboard-height");
      delete root.dataset.keyboard;
    };
    // Moving between fields with the keyboard already up.
    const onFocus = () => { if (up) centre(0); else fit(); };
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    el.addEventListener("focusin", onFocus);
    fit();
    return () => {
      clearTimeout(timer);
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      el.removeEventListener("focusin", onFocus);
      clear();
    };
  }, [el]);
}

/** Scroll the field's own list so the field is in the middle of what shows of it, below anything
    pinned to its top; the page itself never scrolls. */
function centreInList(field: HTMLElement) {
  let box = field.parentElement;
  while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
  if (!box) return;
  const f = field.getBoundingClientRect(), b = box.getBoundingClientRect();
  let top = b.top;
  for (const pinned of box.querySelectorAll<HTMLElement>("[data-pinned]")) {
    if (!pinned.contains(field)) top = Math.max(top, pinned.getBoundingClientRect().bottom);
  }
  if (top >= b.bottom) return;
  box.scrollBy({ top: f.top + f.height / 2 - (top + b.bottom) / 2, behavior: "smooth" });
}
