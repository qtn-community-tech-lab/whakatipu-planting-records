"use client";
/**
 * A form over a full-screen view (a map): a panel on the right on wide
 * screens, which never closes, and a bottom drawer on phones that snaps
 * between PEEK, MID and TALL. Place it inside a positioned element and pass
 * that element as `container`; the drawer is drawn inside it.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { ComboboxPortalContainer } from "@/components/ui/combobox";
import s from "./form-panel.module.css";

/** Drawer heights: the header only, two thirds of a phone (where it opens), nearly all of it. */
export const PEEK = "150px";
export const MID = "560px";
export const TALL = 0.92;
export type Snap = string | number | null;

export function FormPanel({ wide, open, container, snap, onSnap, eyebrow, title, children }: {
  wide: boolean;
  open: boolean;
  /** The positioned element the drawer is drawn inside. */
  container: HTMLElement | null;
  snap: Snap;
  onSnap: (snap: Snap) => void;
  /** The small label at the top of the panel. */
  eyebrow: string;
  /** What the panel is for, for screen readers. */
  title: string;
  children: ReactNode;
}) {
  const [drawerEl, setDrawerEl] = useState<HTMLDivElement | null>(null);

  // shortcut: vaul doesn't pass modal={false} on to Radix Dialog, which then freezes the page
  // (body pointer-events: none) and hides everything outside the drawer (aria-hidden), so the
  // map behind can't be used. Undo both once it opens; drop this when vaul forwards `modal`.
  useEffect(() => {
    if (wide || !open || !container) return;
    const id = requestAnimationFrame(() => {
      document.body.style.pointerEvents = "";
      container.querySelectorAll("[data-aria-hidden]").forEach((el) => {
        el.removeAttribute("aria-hidden");
        el.removeAttribute("data-aria-hidden");
      });
    });
    return () => cancelAnimationFrame(id);
  }, [wide, open, container]);

  const body = (
    <div className={s.scroll} data-vaul-no-drag>
      {/* vaul leaves <body> with pointer-events: none, so dropdowns open their lists in the drawer. */}
      <ComboboxPortalContainer value={wide ? null : drawerEl}>{children}</ComboboxPortalContainer>
    </div>
  );

  if (wide) {
    return open ? (
      <aside className={s.side} aria-label={title}>
        <span className={s.eyebrow}>{eyebrow}</span>
        {body}
      </aside>
    ) : null;
  }

  if (!container) return null;
  return (
    <Drawer
      container={container} modal={false} dismissible={false} open={open}
      snapPoints={[PEEK, MID, TALL]} activeSnapPoint={snap} setActiveSnapPoint={onSnap}
    >
      <DrawerContent ref={setDrawerEl} className={s.bottom}>
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        {/* The drawer is full height and slides down; its contents only fill the part that shows,
            so buttons at the bottom of the form stay on screen at every snap. */}
        <div className={s.sheetBody} style={{ height: `calc(${visibleHeight(snap)} - 15px)` }}>{body}</div>
      </DrawerContent>
    </Drawer>
  );
}

/** How much of the drawer shows at a snap, as a CSS height. */
function visibleHeight(snap: Snap): string {
  return typeof snap === "number" ? `${snap * 100}%` : snap ?? MID;
}
