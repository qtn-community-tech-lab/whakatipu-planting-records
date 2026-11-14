"use client";
/**
 * The planted areas over the big map, as SVG: each kept area with its number (and name), and the one being
 * drawn with its corners and + handles to drag, the dashed line to the pointer and the line being
 * traced. Redrawn as the map moves. Only the handles take the pointer; the map gets the rest.
 */
import type * as maplibregl from "maplibre-gl";
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { LngLat } from "@/lib/wrt/areas/planted-area";
import type { DrawArea } from "./use-draw-area";
import s from "./draw-area.module.css";

/** Corners closer than this on screen (px) get no + between them. */
const MID_MIN_PX = 36;

export function AreaOverlay({ map, draw, shown = null }: {
  map: RefObject<maplibregl.Map | null>; draw: DrawArea;
  /** One kept area to bring forward (its id): the map round it darkens a little and the others fade. */
  shown?: number | null;
}) {
  const { areas, draft, trace, cursor } = draw;
  const visible = areas.length > 0 || !!draft;

  // Redraw as the map moves, so the shapes stay on their ground. Subscribed once there's a shape:
  // the map is made in the parent's effect, after this one first runs, so it isn't there on mount.
  const [, redraw] = useState(0);
  useEffect(() => {
    const m = map.current;
    if (!m || !visible) return;
    const tick = () => redraw((n) => n + 1);
    m.on("move", tick);
    m.on("resize", tick);
    return () => { m.off("move", tick); m.off("resize", tick); };
  }, [map, visible]);

  const m = map.current;
  if (!m || !visible) return null;

  const px = (at: LngLat) => m.project(at);
  const path = (list: LngLat[], z: boolean) =>
    list.length ? `M${list.map((p) => { const q = px(p); return `${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join("L")}${z ? "Z" : ""}` : "";
  const middle = (list: LngLat[]) => {
    const q = list.map(px);
    return { x: q.reduce((t, p) => t + p.x, 0) / q.length, y: q.reduce((t, p) => t + p.y, 0) / q.length };
  };

  const pts = draft?.pts ?? [];
  const canClose = !!draft && !draft.closed && pts.length >= 3;
  // Corners can be dragged when tapping them, and once a trace is a shape.
  const canDrag = !!draft && (draft.closed || draft.method === "corners");

  /** Drag a corner (`i`), or a + after corner `i` that becomes one. */
  function grab(e: ReactPointerEvent, i: number, isMid: boolean) {
    e.stopPropagation();
    e.preventDefault();
    if (!isMid && i === 0 && canClose) return draw.change({ closed: true });
    const box = m!.getCanvasContainer().getBoundingClientRect();
    // The handle is bigger than its dot: keep the gap between the finger and the dot, so the corner doesn't jump under the finger.
    const handle = e.currentTarget.getBoundingClientRect();
    const gap = { x: handle.left + handle.width / 2 - e.clientX, y: handle.top + handle.height / 2 - e.clientY };
    const at = (ev: PointerEvent): LngLat => {
      const p = m!.unproject([ev.clientX + gap.x - box.left, ev.clientY + gap.y - box.top]);
      return [p.lng, p.lat];
    };
    const index = isMid ? i + 1 : i;
    const pointer = e.pointerId;
    if (isMid) draw.addCorner(i, at(e.nativeEvent));
    else draw.grab();
    e.currentTarget.setPointerCapture(pointer);
    // Fingers: phones (iOS Safari above all) don't reliably honour touch-action on SVG parts, so after a few px
    // the browser would take the drag as a pan, cancel it, and the corner would stop dead. Held, it's ours.
    const keepTouch = (ev: TouchEvent) => ev.preventDefault();
    if (e.pointerType !== "mouse") document.addEventListener("touchmove", keepTouch, { passive: false });
    // On the window, not the handle: if the handle goes mid-drag (Done, Undo), the lift is still heard,
    // or the page would be left unable to scroll by touch.
    const move = (ev: PointerEvent) => { if (ev.pointerId === pointer) draw.moveCorner(index, at(ev)); };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return;
      document.removeEventListener("touchmove", keepTouch);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const last = pts[pts.length - 1];
  // The shown area, while nothing is being drawn: everything outside it is darkened (a hole cut in a cover).
  const focus = !draft ? areas.find((a) => a.id === shown) : undefined;
  const box = m.getContainer();
  return (
    <svg className={s.overlay} aria-hidden="true">
      {focus && <path className={s.dim} fillRule="evenodd" d={`M0 0H${box.clientWidth}V${box.clientHeight}H0Z ${path(focus.pts, true)}`} />}
      {/* The kept areas, numbered as in the bar. The one being changed is drawn as the draft instead. */}
      {areas.map((a, i) => {
        if (draft?.editing === i) return null;
        const c = middle(a.pts);
        return (
          <g key={a.id} className={focus ? (a === focus ? s.focused : s.faded) : undefined}>
            <path className={s.kept} d={path(a.pts, true)} />
            <circle className={s.badge} cx={c.x} cy={c.y} r={12} /><text className={s.badgeText} x={c.x} y={c.y}>{i + 1}</text>
            {a.name && <text className={s.nameLabel} x={c.x} y={c.y + 16}>{a.name}</text>}
          </g>
        );
      })}
      {draft && (
        <>
          {canClose && <path className={s.preview} d={path(pts, true)} />}
          <path className={draft.closed ? s.shapeClosed : s.shape} d={path(pts, draft.closed)} />
          {!draft.closed && last && cursor && <path className={s.ghost} d={path([last, cursor], false)} />}
          {trace && <path className={s.trace} d={path(trace, false)} />}
          {draft.closed && pts.map((p, i) => {
            const a = px(p), b = px(pts[(i + 1) % pts.length]!);
            // Hidden, not removed, between close corners: a + being dragged holds the finger, and has to stay to hear it lift.
            const close = Math.hypot(a.x - b.x, a.y - b.y) < MID_MIN_PX;
            return (
              <g key={`m${i}`} className={s.mid} style={close ? { display: "none" } : undefined} transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`} onPointerDown={(e) => grab(e, i, true)}>
                <circle className={s.hit} r={22} />
                <circle className={s.midDot} r={7} />
                <path className={s.plus} d="M-3.5 0H3.5M0 -3.5V3.5" />
              </g>
            );
          })}
          {pts.map((p, i) => {
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
        </>
      )}
    </svg>
  );
}
