"use client";
/**
 * A small, still satellite map of where the event is (the chosen site's pin, or a new location),
 * shown in the form, with the planted area if one's drawn. Built on the app's map wrapper
 * (components/ui/map). Tapping it shows the big map.
 */
import { Map, MapGeoJSON, MapMarker, MarkerContent } from "@/components/ui/map";
import { boundsOf, SATELLITE } from "./map-scene";
import type { LngLat } from "./sites";
import s from "./record-sheet.module.css";

export function MiniMap({ at, area, label, sub, isSpot, onOpen }: {
  at: LngLat; label: string; sub?: string;
  /** The drawn planted area: shown, and the map centres on it. */
  area?: readonly LngLat[] | null;
  /** A new location: the same teardrop pin as on the big map, not a site's dot. */
  isSpot: boolean;
  /** Phones: tapping it shows the big map. Without it (desktop, where the big map is beside), it's just a picture. */
  onOpen?: () => void;
}) {
  const Box = onOpen ? "button" : "div";
  const centre = area?.length ? boundsOf(area).getCenter().toArray() as LngLat : at;
  return (
    <Box
      className={s.mini} {...(onOpen ? { type: "button" as const, onClick: onOpen, "aria-label": `${label}: show on the map` } : { role: "img", "aria-label": `Map of ${label}` })}
    >
      <Map
        className={s.miniMap} theme="light" styles={{ light: SATELLITE, dark: SATELLITE }}
        viewport={{ center: centre, zoom: area?.length ? 16 : 15 }} onViewportChange={() => {}} interactive={false} attributionControl={false}
      >
        {area?.length ? (
          <MapGeoJSON
            id="planted-area" data={{ type: "Polygon", coordinates: [[...area, area[0]]] }}
            fillPaint={{ "fill-color": "#d6ea8c", "fill-opacity": 0.35 }} linePaint={{ "line-color": "#d6ea8c", "line-width": 2.5 }}
          />
        ) : (
          <MapMarker longitude={at[0]} latitude={at[1]}>
            <MarkerContent><span className={isSpot ? s.spot : s.miniPin} /></MarkerContent>
          </MapMarker>
        )}
      </Map>
      <span className={s.miniLabel}>
        <b>{label}</b>
        {sub && <span>{sub}</span>}
      </span>
    </Box>
  );
}
