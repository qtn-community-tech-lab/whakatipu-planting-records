"use client";
/**
 * The two ways to add a location that isn't in the list, side by side at the top of the site
 * list and the site chooser: a new location (a pin), or a drawn area. The same two as the
 * header's + menu. Either can be left out.
 */
import { MapPinPlus, Pentagon } from "lucide-react";
import s from "./add-to-map.module.css";

export function AddToMap({ onAddLocation, onDrawArea }: { onAddLocation?: (() => void) | undefined; onDrawArea?: (() => void) | undefined }) {
  return (
    <div className={s.row}>
      <p className={s.lead}>Not in the list?</p>
      <div className={s.buttons}>
        {onAddLocation && (
          <button type="button" className={s.button} onClick={onAddLocation}>
            <MapPinPlus size={20} strokeWidth={2.2} aria-hidden="true" />New location
          </button>
        )}
        {onDrawArea && (
          <button type="button" className={s.button} onClick={onDrawArea}>
            <Pentagon size={20} strokeWidth={2.2} aria-hidden="true" />Draw area
          </button>
        )}
      </div>
    </div>
  );
}
