import type { FeatureCollection } from "geojson";
import type { FillLayerSpecification, LineLayerSpecification } from "maplibre-gl";
import type { LngLat } from "./planted-area";

/** WGS84 longitude/latitude, with one closed ring. */
export type AreaBoundary = { type: "Polygon"; coordinates: [LngLat[]] };
const boundaryColour = "#0e7490";
export const boundaryFill: NonNullable<FillLayerSpecification["paint"]> = {
  "fill-color": boundaryColour,
  "fill-opacity": 0.16,
};
export const boundaryLine: NonNullable<LineLayerSpecification["paint"]> = {
  "line-color": boundaryColour,
  "line-width": 3,
};

export function boundaryFromCorners(corners: LngLat[]): AreaBoundary {
  return { type: "Polygon", coordinates: [[...corners, ...corners.slice(0, 1)]] };
}

export function boundaryFeatures(boundaries: readonly AreaBoundary[]): FeatureCollection<AreaBoundary, null> {
  return {
    type: "FeatureCollection",
    features: boundaries.map((boundary) => ({
      type: "Feature",
      geometry: boundary,
      properties: null,
    })),
  };
}
