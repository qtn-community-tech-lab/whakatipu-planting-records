"use client";
import type * as maplibregl from "maplibre-gl";
import { LocateFixed, MapPinPlus, Minus, Pencil, Plus } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import s from "./navigator.module.css";

/**
 * Wide screens: a toolbar down the map's right edge (draw an area, a new location, find me, zoom),
 * and a bar centred along the bottom of the map: Draw area, and with areas kept, stepping through them.
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
  /** Let the area brought forward go. */
  onLetGo: () => void;
}) {
  // A short word when Find me can't: no location on this browser, or it was refused.
  const [said, setSaid] = useState("");
  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => setSaid(""), 4000);
    return () => clearTimeout(t);
  }, [said]);

  function findMe() {
    if (!("geolocation" in navigator)) return setSaid("This browser can't say where you are");
    setSaid("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSaid("");
        const m = map.current;
        m?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: Math.max(m.getZoom(), 15), duration: 1500 });
      },
      (e) => setSaid(e.code === e.PERMISSION_DENIED ? "Location is turned off for this site" : "Couldn't find where you are"),
      // Without a timeout, a dismissed permission prompt would leave it finding forever.
      { timeout: 10000 },
    );
  }

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
      {/* While drawing or placing, the bar along the bottom is theirs. */}
      {!drawing && (
        <div className={s.rest} role="group" aria-label="On the map">
          <button type="button" className={s.restDraw} onClick={onDraw} aria-keyshortcuts="D">
            <Pencil size={16} strokeWidth={2.4} aria-hidden="true" />Draw area<kbd aria-hidden="true">D</kbd>
          </button>
          {areas > 0 && (
            <>
              <button type="button" className={s.restKey} onClick={() => onStep(-1)} aria-label="Previous area" aria-keyshortcuts="ArrowUp" title="Previous area"><kbd aria-hidden="true">↑</kbd></button>
              <span className={s.restLabel}>{shown >= 0 ? `Area ${shown + 1} of ${areas}` : areas === 1 ? "1 area" : `${areas} areas`}</span>
              <button type="button" className={s.restKey} onClick={() => onStep(1)} aria-label="Next area" aria-keyshortcuts="ArrowDown" title="Next area"><kbd aria-hidden="true">↓</kbd></button>
              {shown >= 0 && (
                <button type="button" onClick={onLetGo} aria-keyshortcuts="Escape">Close<kbd aria-hidden="true">Esc</kbd></button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
