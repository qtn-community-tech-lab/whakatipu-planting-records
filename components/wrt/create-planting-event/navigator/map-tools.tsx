"use client";
import type * as maplibregl from "maplibre-gl";
import { LocateFixed, MapPinPlus, Minus, Pencil, Plus } from "lucide-react";
import type { RefObject } from "react";
import { useFindMe } from "../map/use-planting-map";
import s from "./navigator.module.css";

/**
 * Wide screens: a toolbar down the map's right edge, and a bar along the bottom for stepping through the areas.
 * Each button in the bar shows its key, so the keys are learned from the buttons that do the same thing.
 */
export function MapTools({ map, drawing, onDraw, onAddLocation, areas, shown, onStep, onLetGo }: {
  map: RefObject<maplibregl.Map | null>;
  /** While drawing, only the zoom and Find me work. */
  drawing: boolean;
  onDraw: () => void;
  /** Left out once an area is drawn, as in the header's + menu on phones. */
  onAddLocation?: (() => void) | undefined;
  /** How many areas are kept, and which is brought forward (its place in the list, or -1). */
  areas: number;
  shown: number;
  /** The area before (-1) or after (1) the one brought forward. */
  onStep: (by: number) => void;
  onLetGo: () => void;
}) {
  const { findMe, said } = useFindMe(map);

  return (
    <>
      <div className={s.tools} role="group" aria-label="Map tools">
        <button type="button" className={s.toolDraw} onClick={onDraw} disabled={drawing} aria-label="Draw area" aria-keyshortcuts="D" title="Draw area (D)" data-draws="">
          <Pencil size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
        {onAddLocation && (
          <button type="button" onClick={onAddLocation} disabled={drawing} aria-label="New location" title="New location">
            <MapPinPlus size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
        <button type="button" onClick={findMe} aria-label="Find me" title="Find me">
          <LocateFixed size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <span className={s.toolGap} aria-hidden="true" />
        <button type="button" onClick={() => map.current?.zoomIn()} aria-label="Zoom in" title="Zoom in">
          <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => map.current?.zoomOut()} aria-label="Zoom out" title="Zoom out">
          <Minus size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      <p className={s.toolSaid} role="status">{said}</p>
      {/* The drawn areas, stepped through (Draw area is the toolbar's pencil, or D). While drawing or placing, the bottom is theirs. */}
      {!drawing && areas > 0 && (
        <div className={s.rest} role="group" aria-label="Drawn areas">
              <button type="button" className={s.restKey} onClick={() => onStep(-1)} aria-label="Previous area" aria-keyshortcuts="ArrowUp" title="Previous area"><kbd aria-hidden="true">↑</kbd></button>
              <span className={s.restLabel}>{shown >= 0 ? `Area ${shown + 1} of ${areas}` : areas === 1 ? "1 area" : `${areas} areas`}</span>
              <button type="button" className={s.restKey} onClick={() => onStep(1)} aria-label="Next area" aria-keyshortcuts="ArrowDown" title="Next area"><kbd aria-hidden="true">↓</kbd></button>
              {shown >= 0 && (
                <button type="button" onClick={onLetGo} aria-keyshortcuts="Escape">Close<kbd aria-hidden="true">Esc</kbd></button>
              )}
        </div>
      )}
    </>
  );
}
