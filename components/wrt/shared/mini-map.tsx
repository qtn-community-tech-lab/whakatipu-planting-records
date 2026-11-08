"use client";
/**
 * A small, still satellite map of one place: its pin and a label. Built on the app's map wrapper
 * (components/ui/map). With `onOpen` it's a button (e.g. to show the big map); without, a picture.
 */
import { Map, MapMarker, MarkerContent } from "@/components/ui/map";
import { SATELLITE } from "./satellite";
import s from "./mini-map.module.css";

/** The lime teardrop of a new location not yet saved, for a big map's marker too. */
export const NEW_PIN_CLASS = s.newPin;

export function MiniMap({ at, label, sub, isNew = false, onOpen }: {
  /** [longitude, latitude] */
  at: [number, number];
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
        viewport={{ center: at, zoom: 15 }} onViewportChange={() => {}} interactive={false} attributionControl={false}
      >
        <MapMarker longitude={at[0]} latitude={at[1]}>
          <MarkerContent><span className={isNew ? s.newPin : s.pin} /></MarkerContent>
        </MapMarker>
      </Map>
      <span className={s.label}>
        <b>{label}</b>
        {sub && <span>{sub}</span>}
      </span>
    </Box>
  );
}
