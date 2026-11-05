"use client";
/**
 * The map on the planting-event form: draw exactly one area, see the site's
 * other recorded areas faintly underneath, switch between satellite and
 * street maps, and centre on your own location.
 *
 * Drawing uses terra-draw (touch and mouse). Flow:
 *   no area yet → "polygon" mode: tap/click corners, tap the first corner
 *                 (or double-click, or Enter) to close the shape
 *   area drawn  → "select" mode: drag corners to adjust, tap a midpoint to
 *                 add one; "Redraw" clears it and starts again
 * Every finished or edited shape is reported up through onChange as GeoJSON.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type * as GeoJSON from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode, ValidateNotSelfIntersecting,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { Map, MapControls, useMap } from "@/components/ui/map";
import { formatHectares, polygonAreaM2 } from "@/lib/wrt/events/geo";

/** Another event at the same site, drawn faintly for reference. */
export interface OtherArea {
  id: string;
  /** "Autumn 2026 · 12 May". */
  label: string;
  polygon: GeoJSON.Polygon;
}

export type MapFocus =
  | { kind: "bounds"; bounds: [[number, number], [number, number]] }
  | { kind: "region" };

/** Wakatipu basin: where the map starts when a site has no reference location. */
const REGION = { center: [168.75, -45.01] as [number, number], zoom: 10 };

// ponytail: Esri World Imagery is free to view with attribution; switch to LINZ
// aerial basemaps (needs a free API key) if WRT wants NZ-sourced imagery.
const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION = "Imagery © Esri, Maxar, Earthstar Geographics";

const GREEN = "#1f4d34";
const LIME = "#d6ea8c";

function polygonBounds(p: GeoJSON.Polygon): [[number, number], [number, number]] {
  const lons = p.coordinates[0].map((c) => c[0]);
  const lats = p.coordinates[0].map((c) => c[1]);
  return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
}

/** Satellite raster under the labels, plus the faint outlines of other events. */
function ReferenceLayers({ satellite, others }: { satellite: boolean; others: OtherArea[] }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || map.getSource("ev-satellite")) return;
    // Put imagery under the first label layer so place names stay readable on top.
    const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
    map.addSource("ev-satellite", {
      type: "raster", tiles: [SATELLITE_TILES], tileSize: 256, maxzoom: 19, attribution: SATELLITE_ATTRIBUTION,
    });
    map.addLayer({ id: "ev-satellite", type: "raster", source: "ev-satellite", layout: { visibility: "none" } }, firstSymbol);
    map.addSource("ev-others", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "ev-others-fill", type: "fill", source: "ev-others", paint: { "fill-color": LIME, "fill-opacity": 0.18 } });
    map.addLayer({ id: "ev-others-line", type: "line", source: "ev-others", paint: { "line-color": LIME, "line-width": 1.5, "line-dasharray": [2, 2] } });
    map.addLayer({
      id: "ev-others-label", type: "symbol", source: "ev-others",
      layout: { "text-field": ["get", "label"], "text-size": 11, "text-font": ["Montserrat SemiBold"] },
      paint: { "text-color": GREEN, "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    });
  }, [map, isLoaded]);

  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer("ev-satellite")) return;
    map.setLayoutProperty("ev-satellite", "visibility", satellite ? "visible" : "none");
  }, [map, isLoaded, satellite]);

  useEffect(() => {
    const src = map && isLoaded ? map.getSource("ev-others") : undefined;
    if (!src || src.type !== "geojson") return;
    (src as unknown as { setData(d: GeoJSON.FeatureCollection): void }).setData({
      type: "FeatureCollection",
      features: others.map((o) => ({ type: "Feature", id: o.id, properties: { label: o.label }, geometry: o.polygon })),
    });
  }, [map, isLoaded, others]);

  return null;
}

/** Move the map when the site (or part) changes. */
function FocusOn({ focus, polygon }: { focus: MapFocus; polygon: GeoJSON.Polygon | null }) {
  const { map, isLoaded } = useMap();
  const key = JSON.stringify(focus);
  const hasPolygon = useRef(polygon !== null);
  useEffect(() => {
    if (!map || !isLoaded) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450;
    // Editing an event: start on its drawn area, not on the site's reference point.
    if (hasPolygon.current && polygon) {
      hasPolygon.current = false;
      map.fitBounds(polygonBounds(polygon), { padding: 60, maxZoom: 18, duration: 0 });
      return;
    }
    if (focus.kind === "bounds") map.fitBounds(focus.bounds, { padding: 80, maxZoom: 16, duration });
    else map.easeTo({ ...REGION, duration });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, key]);
  return null;
}

/**
 * Start the attribution collapsed (a small ⓘ button that expands on tap).
 *
 * MapLibre's compact attribution opens expanded (class
 * "maplibregl-compact-show") and only collapses on the first map *drag*. On
 * this map the first gesture is tapping corners, not dragging, so on a phone
 * the credits box sat over the bottom of the drawing area. Once the map is
 * first idle (style, imagery and labels loaded, so the attribution text is
 * final), collapse it the same way MapLibre's own drag handler does.
 * Collapsing only once means it stays open if the user taps to expand it.
 */
function CollapsedAttribution() {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    const collapse = () =>
      map.getContainer().querySelector(".maplibregl-ctrl-attrib.maplibregl-compact")?.classList.remove("maplibregl-compact-show");
    map.once("idle", collapse);
    return () => { map.off("idle", collapse); };
  }, [map, isLoaded]);
  return null;
}

/** The terra-draw instance, bound to the MapLibre map for the life of the form. */
function Drawing({
  polygon, onChange, onModeChange, drawRef,
}: {
  polygon: GeoJSON.Polygon | null;
  onChange: (p: GeoJSON.Polygon | null) => void;
  onModeChange: (m: "draw" | "edit") => void;
  drawRef: React.RefObject<{ redraw(): void } | null>;
}) {
  const { map, isLoaded } = useMap();
  // Read the latest callbacks inside terra-draw listeners without restarting it.
  const onChangeRef = useRef(onChange);
  const onModeRef = useRef(onModeChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    onModeRef.current = onModeChange;
  });
  // Only the first polygon is loaded into terra-draw; after that terra-draw owns the shape.
  const initial = useRef(polygon);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: map as MapLibreMap }),
      modes: [
        new TerraDrawPolygonMode({
          validation: (feature) => ValidateNotSelfIntersecting(feature),
          styles: { fillColor: LIME, fillOpacity: 0.35, outlineColor: LIME, outlineWidth: 2.5, closingPointColor: GREEN, closingPointWidth: 7 },
        }),
        new TerraDrawSelectMode({
          flags: {
            polygon: { feature: { draggable: false, coordinates: { midpoints: true, draggable: true, deletable: true } } },
          },
          styles: {
            selectedPolygonColor: LIME, selectedPolygonFillOpacity: 0.35, selectedPolygonOutlineColor: GREEN,
            selectedPolygonOutlineWidth: 2.5, selectionPointColor: GREEN, selectionPointWidth: 7, midPointColor: GREEN,
          },
        }),
      ],
    });

    /** The one polygon on the map, if any (terra-draw also stores helper points). */
    const current = () => draw.getSnapshot().find((f) => f.geometry.type === "Polygon" && f.properties.mode === "polygon");
    const report = () => {
      const f = current();
      onChangeRef.current(f ? { type: "Polygon", coordinates: (f.geometry as GeoJSON.Polygon).coordinates } : null);
    };
    const edit = (id: string | number) => {
      draw.setMode("select");
      draw.selectFeature(id);
      onModeRef.current("edit");
    };

    draw.start();
    if (initial.current) {
      const [result] = draw.addFeatures([{
        id: crypto.randomUUID(), type: "Feature", geometry: initial.current, properties: { mode: "polygon" },
      }]);
      if (result?.valid) edit(result.id as string);
      else { draw.setMode("polygon"); onModeRef.current("draw"); }
    } else {
      draw.setMode("polygon");
      onModeRef.current("draw");
    }

    // "finish" fires once per completed gesture: closing the shape, and each
    // corner drag, midpoint insert or corner delete in select mode. Mid-drag
    // frames are not reported, so the form re-renders once per edit.
    draw.on("finish", (id, ctx) => {
      if (ctx.action === "draw") edit(id); // shape closed: switch to adjusting it
      report();
    });
    draw.on("deselect", () => {
      // Tapping off the shape deselects it; keep it editable rather than dropping into a dead mode.
      const f = current();
      if (f) setTimeout(() => draw.getMode() === "select" && draw.selectFeature(f.id as string), 0);
    });

    drawRef.current = {
      redraw() {
        draw.clear();
        draw.setMode("polygon");
        onModeRef.current("draw");
        onChangeRef.current(null);
      },
    };

    return () => {
      drawRef.current = null;
      // On unmount (e.g. the redirect after saving) the parent <Map> runs its
      // cleanup first and calls map.remove(); terra-draw's stop() would then
      // try to clear layers on a destroyed map and throw. Nothing is left to
      // clean in that case, so only stop while the map still has its style.
      if (map.getStyle()) draw.stop();
    };
  }, [map, isLoaded, drawRef]);

  return null;
}

export function DrawMap({
  polygon, onChange, focus, others, invalid,
}: {
  polygon: GeoJSON.Polygon | null;
  onChange: (p: GeoJSON.Polygon | null) => void;
  focus: MapFocus;
  others: OtherArea[];
  invalid?: boolean;
}) {
  const [satellite, setSatellite] = useState(true);
  const [mode, setMode] = useState<"draw" | "edit">(polygon ? "edit" : "draw");
  const drawRef = useRef<{ redraw(): void } | null>(null);

  return (
    <div className="ev-map">
      <div className="ev-map__toolbar">
        <div className="cn-seg ev-map__seg" role="radiogroup" aria-label="Base map">
          <button type="button" role="radio" aria-checked={satellite} className="cn-seg__opt" onClick={() => setSatellite(true)}>Satellite</button>
          <button type="button" role="radio" aria-checked={!satellite} className="cn-seg__opt" onClick={() => setSatellite(false)}>Street</button>
        </div>
        {polygon && (
          <button type="button" className="cn-btn cn-btn--soft cn-btn--sm" onClick={() => drawRef.current?.redraw()}>
            Redraw area
          </button>
        )}
      </div>
      <div className={invalid ? "ev-map__frame ev-invalid" : "ev-map__frame"}>
        <Map center={REGION.center} zoom={REGION.zoom} theme="light" doubleClickZoom={false}>
          <ReferenceLayers satellite={satellite} others={others} />
          <FocusOn focus={focus} polygon={polygon} />
          <CollapsedAttribution />
          <Drawing polygon={polygon} onChange={onChange} onModeChange={setMode} drawRef={drawRef} />
          <MapControls showLocate showFullscreen />
        </Map>
      </div>
      <p className="ev-map__help m-0" aria-live="polite">
        {mode === "draw"
          ? "Tap each corner of the planted area. Tap the first corner again to close the shape."
          : polygon
            ? <>Area: <b>{formatHectares(polygonAreaM2(polygon))}</b> · Drag corners to adjust, or tap a midpoint to add a corner.</>
            : "Drag corners to adjust the shape."}
        {focus.kind === "region" && " This site has no reference location yet: pan to it, or use the locate button."}
        {others.length > 0 && ` Dashed areas are the site's other recorded plantings.`}
      </p>
    </div>
  );
}
