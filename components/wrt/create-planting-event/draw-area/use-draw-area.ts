"use client";
/**
 * Drawing planted areas on the planting event page's map. An event can have several.
 *
 * There is one thing being drawn at a time, the draft, or none. A draft is:
 *   method    "corners" (tap each corner) or "trace" (run a finger round the edge)
 *   pts       its corners so far
 *   closed    whether it's a shape yet
 *   editing   which kept area it replaces, or null for a new one
 *   name      what the area is called; needed before Done keeps it
 * Every change to the draft goes through `change`, which keeps the old one for Undo.
 * Done adds the draft to the kept areas (or replaces the one it was editing); Stop drops it.
 * Before Done keeps it, the host may hold it (onKeep returns false), e.g. to ask something first;
 * the draft then stays open until Done(true) or Stop. Nothing is saved yet.
 */
import type * as maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { insideRing, simplifyTrace, type LngLat } from "@/lib/wrt/areas/planted-area";
import { fitArea } from "../map-scene";

export type DrawMethod = "corners" | "trace";
export interface Draft { method: DrawMethod; pts: LngLat[]; closed: boolean; editing: number | null; name: string }
/** A kept area. `id` stays with it (plants are listed against it); its number on screen is its place in the list. */
export interface Area { id: number; pts: LngLat[]; name: string }

/** A tap this close to the first corner (in px) closes the shape. */
const CLOSE_PX = 18;
/** Trace points closer than this (in px) are skipped. */
const TRACE_STEP_PX = 3;

/** Asked before an area is kept: its corners, and how many other areas are kept. False holds it. */
export type OnKeep = (pts: LngLat[], others: number) => boolean;

/**
 * `onTapArea`: a tap on the map while nothing is being drawn, with the kept area under it (its id), or null
 * for a tap beside every area (or on none).
 */
export function useDrawArea(map: RefObject<maplibregl.Map | null>, onKeep?: OnKeep, onTapArea?: (id: number | null) => void) {
  // The latest handlers, so Done and a tap never call a stale one.
  const keep = useRef(onKeep);
  const tapArea = useRef(onTapArea);
  useEffect(() => { keep.current = onKeep; tapArea.current = onTapArea; });
  const [areas, setAreas] = useState<Area[]>([]);
  const nextId = useRef(1);
  const [draft, setDraftState] = useState<Draft | null>(null);
  /** The line being traced, while the finger is down. */
  const [trace, setTrace] = useState<LngLat[] | null>(null);
  /** The pointer on desktop, for the dashed line to the next corner. */
  const [cursor, setCursor] = useState<LngLat | null>(null);

  // Map listeners and Undo read these directly, so they never see a stale draft.
  const now = useRef<Draft | null>(null);
  const history = useRef<Draft[]>([]);
  /** A draw waiting for the next frame (a corner being dragged), or 0. */
  const frame = useRef(0);
  const [steps, setSteps] = useState(0);
  const setDraft = useCallback((next: Draft | null, past: Draft[]) => {
    now.current = next;
    history.current = past;
    setDraftState(next);
    setSteps(past.length);
  }, []);
  /** Change the draft, keeping the old one for Undo. */
  const change = useCallback((edit: Partial<Draft>) => {
    const d = now.current;
    if (d) setDraft({ ...d, ...edit }, [...history.current.slice(-59), d]);
  }, [setDraft]);

  /** Draw a new area, or (with `editing`) change a kept one. */
  const start = useCallback((editing: number | null = null) => {
    const pts = editing === null ? [] : areas[editing]?.pts ?? [];
    setDraft({ method: "corners", pts, closed: pts.length >= 3, editing, name: editing === null ? "" : areas[editing]?.name ?? "" }, []);
    setTrace(null);
  }, [areas, setDraft]);
  // A kept area opened for changing may be anywhere on a big site: the map goes to it.
  const editing = draft?.editing ?? null;
  useEffect(() => {
    const pts = now.current?.pts;
    if (editing !== null && pts && pts.length >= 3 && map.current) fitArea(map.current, pts);
  }, [editing, map]);
  const stop = useCallback(() => { setDraft(null, []); setTrace(null); setCursor(null); }, [setDraft]);
  const undo = useCallback(() => {
    const past = history.current;
    const last = past[past.length - 1];
    if (last) setDraft(last, past.slice(0, -1));
  }, [setDraft]);
  /** Keep the draft; true if it was kept. `asked`: the host has already said yes, so don't ask it again. */
  const done = useCallback((asked = false) => {
    const d = now.current;
    if (!d || d.pts.length < 3 || !d.name.trim()) return false;
    const others = areas.length - (d.editing === null ? 0 : 1);
    if (!asked && keep.current?.(d.pts, others) === false) return false;
    const name = d.name.trim();
    if (d.editing === null) {
      const id = nextId.current++;
      setAreas((all) => [...all, { id, pts: d.pts, name }]);
    } else {
      setAreas((all) => all.map((a, i) => (i === d.editing ? { ...a, pts: d.pts, name } : a)));
    }
    stop();
    return true;
  }, [areas, stop]);
  /** Take a kept area off: the one being changed, or by number. */
  const remove = useCallback((i: number) => {
    setAreas((all) => all.filter((_, j) => j !== i));
    stop();
  }, [stop]);

  // Taps on the map once there are kept areas (the map exists by then): which area, if any. Not while drawing.
  const kept = useRef(areas);
  useEffect(() => { kept.current = areas; });
  const hasAreas = areas.length > 0;
  useEffect(() => {
    const m = map.current;
    if (!m || !hasAreas) return;
    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (now.current || (e.originalEvent.target as Element).closest(".maplibregl-marker")) return;
      const hit = kept.current.find((a) => insideRing(e.point, a.pts.map((p) => m.project(p))));
      tapArea.current?.(hit?.id ?? null);
    };
    m.on("click", onClick);
    return () => { m.off("click", onClick); };
  }, [map, hasAreas]);

  const method = draft?.method;
  const closed = draft?.closed ?? true;

  // Corners: a tap on the map adds one, or closes the shape near the first.
  useEffect(() => {
    const m = map.current;
    if (!m || method !== "corners" || closed) return;
    m.doubleClickZoom.disable(); // two quick taps are two corners
    m.getCanvas().style.cursor = "crosshair";
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const pts = now.current?.pts ?? [];
      const first = pts[0] && m.project(pts[0]);
      if (pts.length >= 3 && first && Math.hypot(first.x - e.point.x, first.y - e.point.y) < CLOSE_PX) return change({ closed: true });
      change({ pts: [...pts, [e.lngLat.lng, e.lngLat.lat]] });
    };
    // Only where a pointer can hover. A phone sends a mouse move with each tap; drawing the line then makes
    // iOS Safari take the tap as a hover and drop its click, so no corner after the first would land.
    const hovers = matchMedia("(hover: hover)").matches;
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (hovers) setCursor([e.lngLat.lng, e.lngLat.lat]);
    };
    const onOut = () => setCursor(null);
    m.on("click", onClick);
    m.on("mousemove", onMove);
    m.on("mouseout", onOut);
    return () => {
      m.off("click", onClick);
      m.off("mousemove", onMove);
      m.off("mouseout", onOut);
      m.doubleClickZoom.enable();
      m.getCanvas().style.cursor = "";
      setCursor(null);
    };
  }, [map, method, closed, change]);

  // Trace: one finger (or the mouse) draws instead of panning; a second finger stops it, to zoom.
  useEffect(() => {
    const m = map.current;
    if (!m || method !== "trace" || closed) return;
    const box = m.getCanvasContainer();
    m.dragPan.disable();
    m.getCanvas().style.cursor = "crosshair";
    // With drag-pan off, MapLibre's CSS lets the browser scroll on one finger, which cancels the
    // trace after the first move. While tracing, the finger is ours.
    m.getCanvas().style.touchAction = box.style.touchAction = "none";
    let id: number | null = null;
    let line: { px: { x: number; y: number }; at: LngLat }[] = [];
    const point = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      const px = { x: e.clientX - r.left, y: e.clientY - r.top };
      const at = m.unproject([px.x, px.y]);
      return { px, at: [at.lng, at.lat] as LngLat };
    };
    const down = (e: PointerEvent) => {
      if (id !== null) { id = null; line = []; setTrace(null); return; } // a second finger: zooming, not drawing
      if (e.button > 0 || (e.target as HTMLElement).closest("button")) return;
      id = e.pointerId;
      const first = point(e);
      line = [first];
      setTrace([first.at]);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const p = point(e), last = line[line.length - 1];
      if (last && Math.hypot(p.px.x - last.px.x, p.px.y - last.px.y) < TRACE_STEP_PX) return;
      line.push(p);
      setTrace(line.map((q) => q.at));
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      setTrace(null);
      const corners = line.length > 8 ? simplifyTrace(line.map((q) => q.px)).map((i) => line[i]!.at) : [];
      line = [];
      if (corners.length >= 3) change({ pts: corners, closed: true });
    };
    // Interrupted (a call, a system gesture): nothing is kept.
    const cancel = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      line = [];
      setTrace(null);
    };
    box.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      box.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      m.dragPan.enable();
      m.getCanvas().style.cursor = "";
      m.getCanvas().style.touchAction = box.style.touchAction = "";
      setTrace(null);
    };
  }, [map, method, closed, change]);

  // Keys on desktop: ⌘Z (or Backspace) undoes, Enter is Done, Esc stops drawing.
  useEffect(() => {
    if (!method) return;
    const onKey = (e: KeyboardEvent) => {
      // Only when nothing else has the keys: no dialog open, and focus on the page or the map, not a field or button.
      const t = e.target as HTMLElement;
      if (document.querySelector("dialog[open]") || (t !== document.body && !t.closest(".maplibregl-canvas-container"))) return;
      if ((e.key === "z" && (e.metaKey || e.ctrlKey)) || e.key === "Backspace") { e.preventDefault(); undo(); }
      else if (e.key === "Enter") { e.preventDefault(); done(); }
      else if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [method, undo, done, stop]);

  return {
    areas, draft, trace, cursor, canUndo: steps > 0,
    start, stop, undo, done, remove, change,
    /** Before anything's drawn: switch between tapping corners and tracing. */
    pickMethod: (how: DrawMethod) => now.current && setDraft({ ...now.current, method: how }, history.current),
    /** Clear the draft's shape and draw it again (Undo brings it back). */
    startAgain: () => change({ pts: [], closed: false }),
    /** Take every area off, e.g. when leaving the event. */
    clear: () => { setAreas([]); stop(); },
    /** Take the kept areas off but go on with the draft, e.g. when it starts a new event. */
    clearKept: () => setAreas([]),
    /** Name the draft as it's typed (no Undo step for each letter). */
    rename: (name: string) => now.current && setDraft({ ...now.current, name }, history.current),
    /** Before dragging a corner: keep the shape for Undo. */
    grab: () => change({}),
    /**
     * Move corner `i` while dragging (no Undo step: grab took it). Done and Undo see each move at once (`now`),
     * but the page draws it at most once a frame: a pointer sends more moves than that, and each draw
     * re-renders the whole sheet, which made dragging stiffer with every area added.
     */
    moveCorner: (i: number, at: LngLat) => {
      const d = now.current;
      if (!d) return;
      now.current = { ...d, pts: d.pts.map((p, j) => (j === i ? at : p)) };
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (now.current) setDraft(now.current, history.current);
      });
    },
    /** Add a corner after corner `i`, at `at`, ready to drag. */
    addCorner: (i: number, at: LngLat) => {
      const pts = now.current?.pts ?? [];
      change({ pts: [...pts.slice(0, i + 1), at, ...pts.slice(i + 1)] });
    },
  };
}

export type DrawArea = ReturnType<typeof useDrawArea>;
