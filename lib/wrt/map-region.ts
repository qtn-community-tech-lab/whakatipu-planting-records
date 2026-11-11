/**
 * The Whakatipu area every map in the app is kept inside.
 *
 * WHAT
 *   PIN_BOUNDS: the box around all active location pins read from Supabase,
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
import { locationBounds, type PlantingAreaPin } from "./site-locations";

export type RegionMapOptions = Pick<MapOptions, "bounds" | "fitBoundsOptions" | "maxBounds" | "cooperativeGestures">;

const PAD_LNG = 0.35; // ≈ 27 km at this latitude
const PAD_LAT = 0.12; // ≈ 13 km

/** Keep room for wide screens while preserving cooperative scrolling and regional limits. */
export function regionMapOptions(areas: readonly Pick<PlantingAreaPin, "lat" | "lng">[]): RegionMapOptions {
  const bounds = locationBounds(areas.flatMap((area) =>
    area.lat === null || area.lng === null ? [] : [{ latitude: area.lat, longitude: area.lng }],
  ));
  return {
    ...(bounds ? {
      bounds,
      maxBounds: [
        [bounds[0][0] - PAD_LNG, bounds[0][1] - PAD_LAT],
        [bounds[1][0] + PAD_LNG, bounds[1][1] + PAD_LAT],
      ] as [[number, number], [number, number]],
    } : {}),
    fitBoundsOptions: { padding: 24 },
    cooperativeGestures: true,
  };
}
