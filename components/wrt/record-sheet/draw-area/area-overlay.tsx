"use client";
/**
 * The planted area over the big map, as SVG: the shape, the dashed line to the pointer, the line
 * being traced, and the corners and + handles you drag. Redrawn as the map moves. Only the
 * handles take the pointer; everything else lets the map have it.
 */
import type * as maplibregl from "maplibre-gl";
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { LngLat } from "@/lib/wrt/areas/planted-area";
import type { DrawArea } from "./use-draw-area";
import s from "./draw-area.module.css";

/** Corners closer than this on screen (px) get no + between them. */
const MID_MIN_PX = 36;

export function AreaOverlay({ map, draw }: { map: RefObject<maplibregl.Map | null>; draw: DrawArea }) {
  const drawing = !!draw.method;
  const pts = drawing ? draw.shape.pts : draw.area ?? [];
  const closed = drawing ? draw.shape.closed : true;
  const shown = pts.length > 0 || !!draw.trace;

  // Redraw as the map moves, so the shape stays on its ground. Subscribed once there's a shape:
  // the map is made in the parent's effect, after this one first runs, so it isn't there on mount.
  const [, redraw] = useState(0);
  useEffect(() => {
    const m = map.current;
    if (!m || !shown) return;
    const tick = () => redraw((n) => n + 1);
    m.on("move", tick);
    m.on("resize", tick);
    return () => { m.off("move", tick); m.off("resize", tick); };
  }, [map, shown]);

  const m = map.current;
  if (!m || !shown) return null;

  const px = (at: LngLat) => m.project(at);
  const path = (list: LngLat[], z: boolean) =>
    list.length ? `M${list.map((p) => { const q = px(p); return `${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join("L")}${z ? "Z" : ""}` : "";
  const canClose = drawing && !closed && pts.length >= 3;
  // Corners can be dragged once there's a shape to fix; while tracing, only after the trace.
  const canDrag = drawing && (closed || draw.method === "corners");

  /** Drag a corner (`i`), or a + after corner `i` that becomes one. */
  function grab(e: ReactPointerEvent, i: number, isMid: boolean) {
    e.stopPropagation();
    e.preventDefault();
    if (!isMid && i === 0 && canClose) return draw.close();
    const box = m!.getCanvasContainer().getBoundingClientRect();
    const at = (ev: PointerEvent): LngLat => {
      const p = m!.unproject([ev.clientX - box.left, ev.clientY - box.top]);
      return [p.lng, p.lat];
    };
    const index = isMid ? i + 1 : i;
    if (isMid) draw.addCorner(i, at(e.nativeEvent));
    else draw.grab();
    const target = e.currentTarget as Element;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => draw.moveCorner(index, at(ev));
    const up = () => {
      target.removeEventListener("pointermove", move as EventListener);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move as EventListener);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  }

  const last = pts[pts.length - 1];
  return (
    <svg className={s.overlay} data-drawing={drawing || undefined} aria-hidden="true">
      {/* While drawing, the shape so far is lightly filled so its size shows before it's closed. */}
      {canClose && <path className={s.preview} d={path(pts, true)} />}
      <path className={closed ? s.shapeClosed : s.shape} d={path(pts, closed)} />
      {drawing && !closed && last && draw.cursor && <path className={s.ghost} d={path([last, draw.cursor], false)} />}
      {draw.trace && <path className={s.trace} d={path(draw.trace, false)} />}
      {drawing && closed && pts.map((p, i) => {
        const a = px(p), b = px(pts[(i + 1) % pts.length]);
        if (Math.hypot(a.x - b.x, a.y - b.y) < MID_MIN_PX) return null;
        return (
          <g key={`m${i}`} className={s.mid} transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`} onPointerDown={(e) => grab(e, i, true)}>
            <circle className={s.hit} r={16} />
            <circle className={s.midDot} r={7} />
            <path className={s.plus} d="M-3.5 0H3.5M0 -3.5V3.5" />
          </g>
        );
      })}
      {drawing && pts.map((p, i) => {
        const q = px(p);
        const first = i === 0 && canClose;
        return (
          <g
            key={`v${i}`} className={first ? s.cornerClose : s.corner} transform={`translate(${q.x} ${q.y})`}
            style={{ pointerEvents: canDrag || first ? "auto" : "none" }} onPointerDown={(e) => grab(e, i, false)}
          >
            {first && <circle className={s.ring} r={9} />}
            <circle className={s.hit} r={20} />
            <circle className={s.dot} r={7} />
          </g>
        );
      })}
    </svg>
  );
}
