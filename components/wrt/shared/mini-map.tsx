"use client";
/**
 * A small, still satellite map of one place: its pin and a label, or the planted areas drawn there
 * (fitted to show them all). Built on the app's map wrapper (components/ui/map). With `onOpen` it's
 * a button (e.g. to show the big map); without, a picture.
 */
import { Map, MapGeoJSON, MapMarker, MarkerContent } from "@/components/ui/map";
import { SATELLITE } from "./satellite";
import s from "./mini-map.module.css";

/** The lime teardrop of a new location not yet saved, for a big map's marker too. */
export const NEW_PIN_CLASS = s.newPin;

type LngLat = [number, number];

/** The space the areas should fit in, px: less than the mini map, so the label doesn't cover them. */
const FIT = { width: 280, height: 100 };

/** The centre and zoom that fit the areas into FIT, zoom 12 to 17 (MapLibre counts zoom in 512px tiles). */
function fitAreas(areas: readonly (readonly LngLat[])[]): { center: LngLat; zoom: number } {
  const all = areas.flat();
  const w = Math.min(...all.map((p) => p[0])), e = Math.max(...all.map((p) => p[0]));
  const s = Math.min(...all.map((p) => p[1])), n = Math.max(...all.map((p) => p[1]));
  const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const byWidth = Math.log2((FIT.width * 360) / (512 * Math.max(e - w, 1e-6)));
  const byHeight = Math.log2((FIT.height * 2 * Math.PI) / (512 * Math.max(mercator(n) - mercator(s), 1e-9)));
  return { center: [(w + e) / 2, (s + n) / 2], zoom: Math.max(12, Math.min(17, byWidth, byHeight)) };
}

export function MiniMap({ at, areas = [], label, sub, isNew = false, onOpen }: {
  /** [longitude, latitude] */
  at: LngLat;
  /** Planted areas drawn here, each a ring of corners: shown instead of the pin, and the map fits them. */
  areas?: readonly (readonly LngLat[])[];
  label: string;
  sub?: string;
  /** A new location: the teardrop pin, not a site's dot. */
  isNew?: boolean;
  onOpen?: () => void;
}) {
  const Box = onOpen ? "button" : "div";
  return (
    <Box
      className={s.mini} {...(onOpen ? { type: "button" as const, onClick: onOpen, "aria-label": `${label}: show on the map` } : { role: "img", "aria-label": `Map of ${label}` })}
    >
      <Map
        className={s.map} theme="light" styles={{ light: SATELLITE, dark: SATELLITE }}
        viewport={areas.length ? fitAreas(areas) : { center: at, zoom: 15 }} onViewportChange={() => {}} interactive={false} attributionControl={false}
      >
        {areas.length ? (
          <MapGeoJSON
            id="planted-areas" data={{ type: "MultiPolygon", coordinates: areas.map((a) => [[...a, a[0]]]) }}
            fillPaint={{ "fill-color": "#d6ea8c", "fill-opacity": 0.35 }} linePaint={{ "line-color": "#d6ea8c", "line-width": 2.5 }}
          />
        ) : (
          <MapMarker longitude={at[0]} latitude={at[1]}>
            <MarkerContent><span className={isNew ? s.newPin : s.pin} /></MarkerContent>
          </MapMarker>
        )}
      </Map>
      <span className={s.label}>
        <b>{label}</b>
        {sub && <span>{sub}</span>}
      </span>
    </Box>
  );
}
