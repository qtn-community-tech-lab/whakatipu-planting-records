"use client";
/**
 * A small, still satellite map of one site or location: its pin and a label, or the planted areas drawn there
 * (fitted to show them all). Built on the app's map wrapper (components/ui/map). With `onOpen` it's
 * a button (e.g. to show the big map); without, a picture.
 */
import { useMemo } from "react";
import { Map, MapGeoJSON, MapMarker, MarkerContent } from "@/components/ui/map";
import { SATELLITE } from "./satellite";
import { cn } from "@/lib/utils";
import s from "./mini-map.module.css";

/** The lime teardrop of a new location not yet saved, for a big map's marker too. */
export const NEW_PIN_CLASS = s.newPin ?? "";

type LngLat = [number, number];

/** The space the areas should fit in, px: less than the mini map, so the label doesn't cover them. The slim strip has less height. */
const FIT = { width: 280, height: 100 };
const FIT_COMPACT = { width: 280, height: 60 };

/** The centre and zoom that fit the areas into `fit`, zoom 12 to 17 (MapLibre counts zoom in 512px tiles). */
function fitAreas(areas: readonly (readonly LngLat[])[], fit: { width: number; height: number }): { center: LngLat; zoom: number } {
  const all = areas.flat();
  const w = Math.min(...all.map((p) => p[0])), e = Math.max(...all.map((p) => p[0]));
  const s = Math.min(...all.map((p) => p[1])), n = Math.max(...all.map((p) => p[1]));
  const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const byWidth = Math.log2((fit.width * 360) / (512 * Math.max(e - w, 1e-6)));
  const byHeight = Math.log2((fit.height * 2 * Math.PI) / (512 * Math.max(mercator(n) - mercator(s), 1e-9)));
  return { center: [(w + e) / 2, (s + n) / 2], zoom: Math.max(12, Math.min(17, byWidth, byHeight)) };
}

const noop = () => {};

export function MiniMap({ at, areas = [], label, sub, isNew = false, onOpen, noCaption = false, compact = false }: {
  /** [longitude, latitude] */
  at: LngLat;
  /** Planted areas drawn here, each a ring of corners: shown instead of the pin, and the map fits them. */
  areas?: readonly (readonly LngLat[])[] | undefined;
  label: string;
  sub?: string | undefined;
  /** A new location: the teardrop pin, not a site's dot. */
  isNew?: boolean | undefined;
  onOpen?: (() => void) | undefined;
  /** Leave the label off the picture, when the place is named right beside it. It still names the map for screen readers. */
  noCaption?: boolean | undefined;
  /** A slim strip (92px, not 150px), e.g. beside the big map, where it only needs to say where. */
  compact?: boolean | undefined;
}) {
  const Box = onOpen ? "button" : "div";
  // Built once per change of areas: the host re-renders often (every corner dragged on the big map), and a
  // new object here would make the map redo its shapes each time, slower with every area added.
  const key = JSON.stringify(areas);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key is what the areas say
  const data = useMemo(() => ({ type: "MultiPolygon" as const, coordinates: areas.map((a) => [[...a, ...a.slice(0, 1)]]) /* closed: the first corner again */ }), [key]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key and the pin's position
  const viewport = useMemo(() => (areas.length ? fitAreas(areas, compact ? FIT_COMPACT : FIT) : { center: at, zoom: 15 }), [key, at[0], at[1], compact]);
  return (
    <Box
      className={cn(
        s.grow, "relative block w-full shrink-0 overflow-hidden rounded-[var(--radius-tile-lg)] border-0 bg-[#1b2a1f] p-0",
        compact ? "h-[92px]" : "h-[150px]",
        onOpen ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cn-green-800)]" : "cursor-default",
      )} {...(onOpen ? { type: "button" as const, onClick: onOpen, "aria-label": `${label}: show on the map` } : { role: "img", "aria-label": `Map of ${label}` })}
    >
      <Map
        className="pointer-events-none !absolute inset-0" theme="light" styles={{ light: SATELLITE, dark: SATELLITE }}
        viewport={viewport} onViewportChange={noop} interactive={false} attributionControl={false}
      >
        {areas.length ? (
          <MapGeoJSON
            id="planted-areas" data={data}
            fillPaint={{ "fill-color": "#d6ea8c", "fill-opacity": 0.35 }} linePaint={{ "line-color": "#d6ea8c", "line-width": 2.5 }}
          />
        ) : (
          <MapMarker longitude={at[0]} latitude={at[1]}>
            <MarkerContent><span className={isNew ? s.newPin : s.pin} /></MarkerContent>
          </MapMarker>
        )}
      </Map>
      {!noCaption && <span className="absolute bottom-2.5 left-2.5 flex max-w-[calc(100%-20px)] flex-col gap-px rounded-xl bg-[rgba(21,38,28,0.9)] px-3 py-[7px] text-left font-sans text-[var(--text-on-dark)]">
        <b className="truncate text-[13.5px] font-bold leading-tight">{label}</b>
        {sub && <span className="truncate text-xs font-medium leading-snug text-[rgba(243,246,238,0.75)]">{sub}</span>}
      </span>}
    </Box>
  );
}
