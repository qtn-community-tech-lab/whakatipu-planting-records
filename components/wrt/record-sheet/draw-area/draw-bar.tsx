"use client";
/**
 * The bar along the bottom of the map. It opens from the header's + menu (Draw area): drawing,
 * one pill that says the next step and holds Undo, Start again and
 * Done, with a switch between tapping corners and tracing until the first corner goes down.
 * Once an area is kept, it stays with the area's size, Change, Redraw and Remove. Every control is a labelled button, and each step is read out by screen readers.
 */
import { Lasso, Pentagon, Pencil, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatHectares, hectares } from "@/lib/wrt/areas/planted-area";
import type { DrawArea, DrawMethod } from "./use-draw-area";
import s from "./draw-area.module.css";

const METHODS: { id: DrawMethod; label: string }[] = [
  { id: "corners", label: "Tap corners" },
  { id: "trace", label: "Trace" },
];

export function DrawBar({ draw, onNew, onEdit, style }: {
  draw: DrawArea;
  /** Draw the area again from nothing (the host drops the phone sheet first). */
  onNew: () => void;
  /** Fix the kept area. */
  onEdit: () => void;
  /** Where it sits: the host knows how tall the phone sheet is. */
  style?: CSSProperties;
}) {
  const [removing, setRemoving] = useState(false);
  // What a screen reader hears: each step while drawing, and what happened when it ends.
  const [said, setSaid] = useState("");
  const bar = useRef<HTMLDivElement>(null);
  const wasDrawing = useRef(false);

  // When drawing ends, the pill's buttons go: put focus on the bar's first button (or, with no area
  // kept, the header's +, where drawing started), not the page.
  useEffect(() => {
    if (wasDrawing.current && !draw.method) {
      setSaid(draw.area ? `Planted area kept: ${formatHectares(hectares(draw.area))}` : "Stopped drawing");
      focusNext();
    }
    wasDrawing.current = !!draw.method;
  }, [draw.method, draw.area]);

  const n = draw.shape.pts.length;
  const ha = n >= 3 ? formatHectares(hectares(draw.shape.pts)) : "";
  const step = draw.method ? message(draw.method, n, draw.shape.closed, !!draw.trace, ha) : null;
  const live = step ? [step.lead, step.rest].filter(Boolean).join(", ") : said;

  function focusNext() {
    const next = bar.current?.querySelector("button") ?? document.querySelector<HTMLElement>('[aria-label="Add to the map"]');
    next?.focus();
  }

  function remove() {
    setRemoving(false);
    draw.removeArea();
    setSaid("Planted area removed");
    requestAnimationFrame(focusNext);
  }

  return (
    <div ref={bar} className={s.bar} style={style}>
      <p className={s.sr} aria-live="polite">{live}</p>
      {!draw.method ? (
        draw.area ? (
          <div className={s.kept} role="group" aria-label={`Planted area, ${formatHectares(hectares(draw.area))}`}>
            <span className={s.keptSize}>
              <Pentagon size={16} strokeWidth={2.2} aria-hidden="true" />
              <b>{formatHectares(hectares(draw.area))}</b>
            </span>
            <button type="button" onClick={onEdit}><Pencil size={16} strokeWidth={2.4} aria-hidden="true" />Change</button>
            <button type="button" onClick={onNew}><RotateCcw size={16} strokeWidth={2.4} aria-hidden="true" />Redraw</button>
            <button type="button" className={s.danger} onClick={() => setRemoving(true)}><Trash2 size={16} strokeWidth={2.4} aria-hidden="true" />Remove</button>
          </div>
        ) : null
      ) : (
        <>
          <div className={s.pill} role="group" aria-label="Drawing the planted area">
            <span className={s.msg} aria-hidden="true">
              {step!.lead && <><span className={s.num}>{step!.lead}</span> · </>}{step!.rest}
            </span>
            <div className={s.pillButtons}>
              <button type="button" className={s.pillBtn} onClick={draw.undo} disabled={!draw.canUndo}>
                <Undo2 size={16} strokeWidth={2.4} aria-hidden="true" />Undo
              </button>
              {n > 0 && (
                <button type="button" className={s.pillBtn} onClick={draw.redraw}>
                  <RotateCcw size={16} strokeWidth={2.4} aria-hidden="true" />Start again
                </button>
              )}
              <button type="button" className={s.pillGo} onClick={draw.done} disabled={n < 3} aria-describedby={n < 3 ? "draw-need" : undefined}>
                Done
              </button>
              <span id="draw-need" hidden>Needs at least three corners</span>
              <button type="button" className={s.pillCancel} onClick={draw.cancel} aria-label="Stop drawing, keep nothing new" title="Stop drawing">
                <X size={18} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
          </div>
          {n === 0 && !draw.trace && (
            <div className={s.methods} role="group" aria-label="How to draw">
              {METHODS.map((m) => (
                <button key={m.id} type="button" aria-pressed={draw.method === m.id} onClick={() => draw.switchTo(m.id)}>
                  {m.id === "corners" ? <Pentagon size={15} strokeWidth={2.4} aria-hidden="true" /> : <Lasso size={15} strokeWidth={2.4} aria-hidden="true" />}
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <ConfirmDialog open={removing} title="Remove the planted area?" confirmLabel="Remove area" onConfirm={remove} onCancel={() => setRemoving(false)}>
        The shape you drew comes off this planting event. You can draw a new one any time.
      </ConfirmDialog>
    </div>
  );
}

/** What the pill says: the area once there is one (`lead`), then the next step. */
function message(method: DrawMethod, n: number, closed: boolean, tracing: boolean, ha: string): { lead?: string; rest: string } {
  if (closed) return { lead: ha, rest: method === "trace" ? `${n} corners · drag to tidy` : "drag corners to adjust" };
  if (method === "trace") return { rest: tracing ? "Keep going round · lift to finish" : "Trace round the planted area in one go" };
  if (n === 0) return { rest: "Tap the first corner of the planted area" };
  if (n < 3) return { rest: `Tap corner ${n + 1} · ${3 - n} more to make a shape` };
  return { lead: ha, rest: "tap the first corner, or Done" };
}
