"use client";
import { useEffect, useRef } from "react";
import type { Area } from "../draw-area";

/**
 * Keys on wide screens: D draws an area, Esc stops drawing or lets go of the area brought forward,
 * Up and Down step through the areas. Up and Down only when nothing else wants them: focus in the
 * panel's area list (they move between its rows), or on the page itself with an area brought forward,
 * not on the map (MapLibre pans with them) or a form control.
 * None of them while typing in a field or with a dialog or menu open.
 */
export function useMapKeys({ on, areas, shown, drawing, onDraw, onStop, onShow, onLetGo }: {
  on: boolean;
  areas: Area[];
  shown: number | null;
  drawing: boolean;
  onDraw: () => void;
  onStop: () => void;
  onShow: (id: number) => void;
  onLetGo: () => void;
}) {
  // The latest of everything, so the listener is added once.
  const now = useRef({ areas, shown, drawing, onDraw, onStop, onShow, onLetGo });
  useEffect(() => { now.current = { areas, shown, drawing, onDraw, onStop, onShow, onLetGo }; });

  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (t.closest("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open], [role=dialog], [role=alertdialog]")) return;
      const { areas, shown, drawing, onDraw, onStop, onShow, onLetGo } = now.current;
      if (e.key === "d" || e.key === "D") {
        if (drawing) return;
        e.preventDefault();
        onDraw();
      } else if (e.key === "Escape") {
        if (drawing) onStop();
        else if (shown !== null) onLetGo();
      } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !drawing && areas.length) {
        const by = e.key === "ArrowUp" ? -1 : 1;
        const list = t.closest("[data-area-list]");
        if (list) {
          // In the list: the next row takes focus and goes to its area.
          const rows = [...list.querySelectorAll<HTMLElement>("[data-area-row]")];
          const i = rows.findIndex((r) => r.parentElement?.contains(t));
          const next = rows[(i + by + rows.length) % rows.length];
          if (!next) return;
          e.preventDefault();
          next.focus();
          next.click();
        } else if (t === document.body && shown !== null) {
          const i = areas.findIndex((a) => a.id === shown);
          e.preventDefault();
          onShow(areas[(i + by + areas.length) % areas.length]!.id); // areas isn't empty: checked above
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on]);
}
