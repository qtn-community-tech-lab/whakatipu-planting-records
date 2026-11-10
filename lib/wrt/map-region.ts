/**
 * The Whakatipu area every map in the app is kept inside.
 *
 * WHAT
 *   PIN_BOUNDS: the box around all reference location pins (data/site-locations.json),
 *   about 45 × 32 km. Maps open on it when there is nothing more specific to show.
 *   MAX_BOUNDS: PIN_BOUNDS plus a margin (about 27 km east–west, 13 km north–south).
 *   Maps cannot be panned or zoomed out beyond it.
 *
 * WHY
 *   Without a limit a map can drift or zoom out to the whole world, which is
 *   never useful here and makes "scrolled too far" easy. The margin is wider
 *   east–west so a wide laptop map can still show every pin at once:
 *   MapLibre keeps the whole visible area inside MAX_BOUNDS, so a box shaped
 *   like the pins would force a wide map to zoom in past them.
 */
import type { MapOptions } from "maplibre-gl";
import { locationBounds, siteLocations } from "./site-locations";

type Bounds = [[number, number], [number, number]];

export const PIN_BOUNDS: Bounds = locationBounds(siteLocations)!;

const PAD_LNG = 0.35; // ≈ 27 km at this latitude
const PAD_LAT = 0.12; // ≈ 13 km

export const MAX_BOUNDS: Bounds = [
  [PIN_BOUNDS[0][0] - PAD_LNG, PIN_BOUNDS[0][1] - PAD_LAT],
  [PIN_BOUNDS[1][0] + PAD_LNG, PIN_BOUNDS[1][1] + PAD_LAT],
];

/**
 * Map options shared by every map: open on the pins, stay inside MAX_BOUNDS,
 * and let the page scroll past the map (cooperative gestures: one finger or a
 * plain mouse wheel scrolls the page; two fingers, pinch or ⌘/Ctrl + scroll
 * move the map).
 */
export const REGION_MAP_OPTIONS: Pick<MapOptions, "bounds" | "fitBoundsOptions" | "maxBounds" | "cooperativeGestures"> = {
  bounds: PIN_BOUNDS,
  fitBoundsOptions: { padding: 24 },
  maxBounds: MAX_BOUNDS,
  cooperativeGestures: true,
};
