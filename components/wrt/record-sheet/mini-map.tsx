"use client";
/**
 * A small, still satellite map of where the event is (the chosen site's pin, or a new location),
 * shown in the form. Built on the app's map wrapper (components/ui/map). Tapping it shows the big map.
 */
import { Map, MapMarker, MarkerContent } from "@/components/ui/map";
import { SATELLITE } from "./map-scene";
import type { LngLat } from "./sites";
import s from "./record-sheet.module.css";

export function MiniMap({ at, label, sub, isSpot, onOpen }: {
  at: LngLat; label: string; sub?: string;
  /** A new location: the same teardrop pin as on the big map, not a site's dot. */
  isSpot: boolean;
  onOpen: () => void;
}) {
  return (
    <button type="button" className={s.mini} onClick={onOpen} aria-label={`${label}: show on the map`}>
      <Map
        className={s.miniMap} theme="light" styles={{ light: SATELLITE, dark: SATELLITE }}
        viewport={{ center: at, zoom: 15 }} onViewportChange={() => {}} interactive={false} attributionControl={false}
      >
        <MapMarker longitude={at[0]} latitude={at[1]}>
          <MarkerContent><span className={isSpot ? s.spot : s.miniPin} /></MarkerContent>
        </MapMarker>
      </Map>
      <span className={s.miniLabel}>
        <b>{label}</b>
        {sub && <span>{sub}</span>}
      </span>
    </button>
  );
}
