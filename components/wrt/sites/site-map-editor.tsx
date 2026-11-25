"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import {
  Map,
  MapGeoJSON,
  MapMarker,
  MarkerContent,
  useMap,
} from "@/components/ui/map";
import { AreaOverlay } from "@/components/wrt/create-planting-event/draw-area/area-overlay";
import { DrawingControls } from "@/components/wrt/create-planting-event/draw-area/drawing-controls";
import drawStyles from "@/components/wrt/create-planting-event/draw-area/draw-area.module.css";
import { MapToolbar } from "@/components/wrt/create-planting-event/navigator/map-tools";
import { useDrawArea } from "@/components/wrt/create-planting-event/draw-area/use-draw-area";
import { boundsOf } from "@/components/wrt/create-planting-event/map/map-scene";
import { SATELLITE_STYLES } from "@/components/wrt/shared/satellite";
import { plantingAreaBoundarySchema, plantingAreaPinSchema } from "@/db/types";
import type { LngLat } from "@/lib/wrt/areas/planted-area";
import {
  boundaryFeatures,
  boundaryFill,
  boundaryFromCorners,
  boundaryLine,
  type AreaBoundary,
} from "@/lib/wrt/areas/geometry";
import mapStyles from "./site-map-editor.module.css";

type EditableArea = {
  id: string;
  label: string;
  pin: LngLat | null;
  boundary: AreaBoundary | null;
};

type SiteMapEditorProps = {
  area: EditableArea;
  otherAreas: EditableArea[];
  disabled: boolean;
  onPinChange: (pin: LngLat | null) => void;
  onBoundaryChange: (boundary: AreaBoundary | null) => void;
  onEditingChange: (areaId: string, editing: boolean) => void;
};

const FIT = {
  padding: { top: 38, bottom: 38, left: 38, right: 74 },
  maxZoom: 16,
  duration: 0,
};

function areaPoints(area: EditableArea): LngLat[] {
  return [
    ...(area.pin ? [area.pin] : []),
    ...(area.boundary?.coordinates[0] ?? []),
  ];
}

function MapReadiness({ onChange }: { onChange: (ready: boolean) => void }) {
  const { isLoaded } = useMap();
  useEffect(() => {
    onChange(isLoaded);
    return () => onChange(false);
  }, [isLoaded, onChange]);
  return null;
}

export default function SiteMapEditor({
  area,
  otherAreas,
  disabled,
  onPinChange,
  onBoundaryChange,
  onEditingChange,
}: SiteMapEditorProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useMemo(() => ({ current: map }), [map]);
  const [placingPin, setPlacingPin] = useState(false);
  const [pinProblem, setPinProblem] = useState<string>();
  const [checkDraft, setCheckDraft] = useState(false);
  const drawButton = useRef<HTMLButtonElement>(null);
  const pinErrorId = useId();
  const { pin, boundary } = area;
  const draw = useDrawArea(mapRef, {
    onSaveBoundary: (corners) => {
      const parsed = plantingAreaBoundarySchema.safeParse(
        boundaryFromCorners(corners),
      );
      if (!parsed.success) {
        setCheckDraft(true);
        return false;
      }
      onBoundaryChange(parsed.data);
      return true;
    },
  });
  const draft = draw.draft;
  const drawing = !!draft;
  const editing = placingPin || drawing;
  const wasDrawing = useRef(false);
  useEffect(() => {
    if (wasDrawing.current && !drawing)
      drawButton.current?.focus({ preventScroll: true });
    wasDrawing.current = drawing;
  }, [drawing]);
  useEffect(
    () => onEditingChange(area.id, editing),
    [area.id, editing, onEditingChange],
  );

  const [initialBounds] = useState(() => {
    const ownPoints = areaPoints(area);
    const points = ownPoints.length
      ? ownPoints
      : otherAreas.flatMap(areaPoints);
    return boundsOf(
      points.length
        ? points
        : [
            [168.66, -45.03],
            [168.88, -44.91],
          ],
    );
  });

  const areas = [...otherAreas, area];
  const boundaries = areas.flatMap((entry) =>
    entry.boundary && !(draft && entry === area) ? [entry.boundary] : [],
  );

  function startBoundary() {
    const points = boundary?.coordinates[0] ?? [];
    if (points.length) map?.fitBounds(boundsOf(points), FIT);
    setCheckDraft(false);
    draw.startBoundary(points.slice(0, -1));
    map?.getCanvas().focus({ preventScroll: true });
  }

  function placePin(at: LngLat) {
    const parsed = plantingAreaPinSchema.safeParse(at);
    if (!parsed.success) {
      setPinProblem(parsed.error.issues[0]?.message);
      return;
    }
    onPinChange(parsed.data);
    setPinProblem(undefined);
    setPlacingPin(false);
  }

  useEffect(() => {
    if (!map || !placingPin || disabled) return;
    const click = (event: MapMouseEvent) =>
      placePin([event.lngLat.lng, event.lngLat.lat]);
    map.getCanvas().style.cursor = "crosshair";
    map.on("click", click);
    return () => {
      map.off("click", click);
      map.getCanvas().style.cursor = "";
    };
  });

  const boundaryProblem =
    draft && checkDraft
      ? plantingAreaBoundarySchema.safeParse(boundaryFromCorners(draft.pts))
          .error?.issues[0]?.message
      : undefined;

  return (
    <div inert={disabled} className="flex min-w-0 flex-col gap-3">
      <div
        role="region"
        aria-label={`Map for ${area.label}`}
        className={`${mapStyles.mapHeight} relative isolate w-full overflow-hidden rounded-lg border bg-muted`}
      >
        <Map
          ref={setMap}
          theme="light"
          styles={SATELLITE_STYLES}
          bounds={initialBounds}
          fitBoundsOptions={FIT}
          cooperativeGestures
          dragRotate={false}
          pitchWithRotate={false}
        >
          <MapReadiness onChange={setMapReady} />
          <MapGeoJSON
            data={boundaryFeatures(boundaries)}
            fillPaint={boundaryFill}
            linePaint={boundaryLine}
          />
          {areas.map(
            (entry) =>
              entry.pin && (
                <MapMarker
                  key={entry.id}
                  longitude={entry.pin[0]}
                  latitude={entry.pin[1]}
                  anchor="bottom"
                >
                  <MarkerContent className="pointer-events-none">
                    <span title={entry.label}>
                      <MapPin
                        aria-hidden="true"
                        className={
                          entry === area
                            ? "size-8 fill-primary text-primary-foreground"
                            : "size-6 fill-muted text-muted-foreground"
                        }
                      />
                    </span>
                  </MarkerContent>
                </MapMarker>
              ),
          )}
          <AreaOverlay map={mapRef} draw={draw} />
        </Map>
        <MapToolbar
          map={mapRef}
          drawing={!mapReady || editing}
          onDraw={startBoundary}
          drawLabel={boundary ? "Edit boundary" : "Draw boundary"}
          drawButtonRef={drawButton}
          onAddLocation={() => setPlacingPin(true)}
          locationLabel={pin ? "Move pin" : "Add pin"}
        />
      </div>
      {draft && (
        <div className={`${drawStyles.bar} ${drawStyles.inlineBar}`}>
          <DrawingControls
            draw={draw}
            onStop={draw.stop}
            label={`Drawing the boundary for ${area.label}`}
            requireName={false}
            subject="boundary"
            doneLabel="Keep boundary"
          />
        </div>
      )}
      {boundaryProblem && (
        <FieldError role="alert">{boundaryProblem}</FieldError>
      )}
      {placingPin ? (
        <Field data-invalid={!!pinProblem}>
          <div
            role="group"
            aria-label={`${area.label} pin`}
            aria-describedby={pinProblem ? pinErrorId : undefined}
            className="flex flex-wrap gap-2"
          >
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              onClick={() => {
                if (!map) return;
                const center = map.getCenter();
                placePin([center.lng, center.lat]);
              }}
            >
              Use map centre
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              onClick={() => {
                setPlacingPin(false);
                setPinProblem(undefined);
              }}
            >
              Cancel pin placement
            </Button>
          </div>
          <FieldDescription role="status">
            Tap or click the map to place the pin, or use the centre of the map.
          </FieldDescription>
          {pinProblem && (
            <FieldError id={pinErrorId} role="alert">
              {pinProblem}
            </FieldError>
          )}
        </Field>
      ) : (
        <>
          {pin && (
            <FieldDescription>
              Latitude {pin[1].toFixed(5)} · Longitude {pin[0].toFixed(5)}
            </FieldDescription>
          )}
          {!drawing && (pin || boundary) && (
            <div className="flex flex-wrap gap-2">
              {pin && (
                <Button
                  type="button"
                  variant="soft"
                  className="min-h-11"
                  onClick={() => onPinChange(null)}
                >
                  Remove pin
                </Button>
              )}
              {boundary && (
                <Button
                  type="button"
                  variant="soft"
                  className="min-h-11"
                  onClick={() => onBoundaryChange(null)}
                >
                  Clear boundary
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
