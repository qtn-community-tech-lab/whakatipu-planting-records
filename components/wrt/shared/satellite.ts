import type { StyleSpecification } from "maplibre-gl";

/** Esri satellite imagery, as a MapLibre style: for maps of where things were planted. */
export const SATELLITE: StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256, maxzoom: 19, attribution: "Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "imagery", type: "raster", source: "imagery" }],
};
