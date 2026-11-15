"use client";
/**
 * The map pins' tooltip: the shared Tooltip over whichever pin the mouse is on or the keyboard has focused,
 * saying the place and its plants (a group: which places it holds). Pins are map markers outside React, so
 * one tooltip follows them through events on the map. Phones tap a pin to open its place instead.
 */
import { useEffect, useState, type RefObject } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function PinTooltip({ map }: { map: RefObject<HTMLElement | null> }) {
  const [tip, setTip] = useState<{ text: string; rect: DOMRect } | null>(null);
  useEffect(() => {
    const el = map.current;
    if (!el) return;
    const pin = (e: Event) => (e.target as Element | null)?.closest<HTMLElement>("[data-tip]");
    const show = (e: Event) => {
      if (e instanceof PointerEvent && e.pointerType !== "mouse") return;
      const p = pin(e);
      if (p) setTip({ text: p.dataset.tip ?? "", rect: p.getBoundingClientRect() });
    };
    const hide = (e: Event) => { if (pin(e)) setTip(null); };
    const clear = () => setTip(null); // the map is about to move, and the pin with it
    const on: [string, EventListener][] = [["pointerover", show], ["pointerout", hide], ["focusin", show], ["focusout", hide], ["pointerdown", clear], ["wheel", clear]];
    for (const [type, fn] of on) el.addEventListener(type, fn, { passive: true });
    return () => { for (const [type, fn] of on) el.removeEventListener(type, fn); };
  }, [map]);
  if (!tip) return null;
  const { left, top, width, height } = tip.rect;
  return (
    <TooltipProvider>
      <Tooltip open>
        <TooltipTrigger asChild>
          <span aria-hidden="true" style={{ position: "fixed", left, top, width, height, pointerEvents: "none" }} />
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="max-w-64 [--foreground:var(--cn-lime-300)] [--background:var(--cn-green-900)]">
          {/* First line the title, then one line each; a last "and N more" line quieter. */}
          {tip.text.split("\n").map((line, i, all) => (
            <span key={i} className={i === 0 ? "block font-medium" : i === all.length - 1 && line.startsWith("and ") ? "block opacity-70" : "block"}>{line}</span>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
