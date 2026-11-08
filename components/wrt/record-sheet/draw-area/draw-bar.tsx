"use client";
/**
 * The bar along the bottom of the map.
 *   Drawing: one pill that says the next step, with Undo, Start again (or Remove, when changing
 *     a kept area), Done and Stop. Until the first corner goes down, a switch between tapping
 *     corners and tracing.
 *   Not drawing, with areas kept: a button per area (its number and size; tap to change it) and
 *     Add area.
 *   Nothing kept: nothing. Drawing starts from the header's + menu or the form.
 * Every control is a labelled button, and each step is read out by screen readers.
 */
import { Lasso, Pentagon, Plus, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatHectares, hectares, type LngLat } from "@/lib/wrt/areas/planted-area";
import type { DrawArea, DrawMethod } from "./use-draw-area";
import s from "./draw-area.module.css";

const METHODS: { id: DrawMethod; label: string }[] = [
  { id: "corners", label: "Tap corners" },
  { id: "trace", label: "Trace" },
];

export function DrawBar({ draw, onAdd, place, onChangePlace, style }: {
  draw: DrawArea;
  /** Where the areas are: the event's site (and part), e.g. "Lake Hayes · Lake Hayes South / Roadside". */
  place?: string;
  /** Change it (the site chooser). */
  onChangePlace: () => void;
  /** Draw another area (the host drops the phone sheet first). */
  onAdd: () => void;
  /** Where it sits: the host knows how tall the phone sheet is. */
  style?: CSSProperties;
}) {
  const { areas, draft } = draw;
  const [removing, setRemoving] = useState<number | null>(null);
  // What a screen reader hears when drawing ends or an area comes off.
  const [said, setSaid] = useState("");
  const bar = useRef<HTMLDivElement>(null);

  // When drawing ends, the pill's buttons go: put focus on the bar's first button (or, with no
  // area kept, the header's +, where drawing started), not the page.
  function focusNext() {
    (bar.current?.querySelector("button") ?? document.querySelector<HTMLElement>('[aria-label="Add to the map"]'))?.focus();
  }
  const wasDrawing = useRef(false);
  useEffect(() => {
    if (wasDrawing.current && !draft) {
      setSaid(areas.length ? `${count(areas.length)}, ${total(areas)}${place ? `, at ${place}` : ""}` : "Stopped drawing");
      focusNext();
    }
    wasDrawing.current = !!draft;
  }, [draft, areas, place]);

  function remove(i: number) {
    setRemoving(null);
    draw.remove(i);
    setSaid(`Area ${i + 1} removed`);
  }

  const n = draft?.pts.length ?? 0;
  const ha = n >= 3 ? formatHectares(hectares(draft!.pts)) : "";
  const step = draft ? message(draft.method, n, draft.closed, !!draw.trace, ha) : null;

  return (
    <div ref={bar} className={s.bar} style={style}>
      <p className={s.sr} aria-live="polite">{step ? [step.lead, step.rest].filter(Boolean).join(", ") : said}</p>
      {draft ? (
        <>
          <div className={s.pill} role="group" aria-label={draft.editing === null ? "Drawing a planted area" : `Changing area ${draft.editing + 1}`}>
            <span className={s.msg} aria-hidden="true">
              {step!.lead && <><span className={s.num}>{step!.lead}</span> · </>}{step!.rest}
            </span>
            <div className={s.pillButtons}>
              <button type="button" className={s.pillBtn} onClick={draw.undo} disabled={!draw.canUndo}>
                <Undo2 size={16} strokeWidth={2.4} aria-hidden="true" />Undo
              </button>
              {draft.editing !== null ? (
                <button type="button" className={`${s.pillBtn} ${s.danger}`} onClick={() => setRemoving(draft.editing)}>
                  <Trash2 size={16} strokeWidth={2.4} aria-hidden="true" />Remove
                </button>
              ) : n > 0 && (
                <button type="button" className={s.pillBtn} onClick={draw.startAgain}>
                  <RotateCcw size={16} strokeWidth={2.4} aria-hidden="true" />Start again
                </button>
              )}
              <button type="button" className={s.pillGo} onClick={() => draw.done()} disabled={n < 3}>Done</button>
              <button type="button" className={s.pillCancel} onClick={draw.stop} aria-label="Stop drawing, keep nothing new" title="Stop drawing">
                <X size={18} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
          </div>
          {n === 0 && !draw.trace && (
            <div className={s.methods} role="group" aria-label="How to draw">
              {METHODS.map((m) => (
                <button key={m.id} type="button" aria-pressed={draft.method === m.id} onClick={() => draw.pickMethod(m.id)}>
                  {m.id === "corners" ? <Pentagon size={15} strokeWidth={2.4} aria-hidden="true" /> : <Lasso size={15} strokeWidth={2.4} aria-hidden="true" />}
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : areas.length > 0 && (
        <>
        <div className={s.keptBar} role="group" aria-label={`Planted areas: ${count(areas.length)}, ${total(areas)}`}>
          {areas.map((a, i) => (
            <button key={i} type="button" onClick={() => draw.start(i)} aria-label={`Change area ${i + 1}, ${formatHectares(hectares(a))}`}>
              <Pentagon size={15} strokeWidth={2.4} aria-hidden="true" />
              {areas.length > 1 && <span className={s.areaNo}>{i + 1}</span>}
              <b>{formatHectares(hectares(a))}</b>
            </button>
          ))}
          <button type="button" className={s.addBtn} onClick={onAdd}>
            <Plus size={16} strokeWidth={2.6} aria-hidden="true" />Add area
          </button>
        </div>
        {/* Where the areas are, plainly: Done may have chosen the site or part from where they were drawn.
            Last in the code, first on screen: the bar stacks upwards. */}
        <p className={s.where}>
          <span>{place ? <>At <b>{place}</b></> : "Not at a site yet"}</span>
          <button type="button" onClick={onChangePlace}>{place ? "Change" : "Choose a site"}</button>
        </p>
        </>
      )}
      <ConfirmDialog
        open={removing !== null} title={`Remove area ${(removing ?? 0) + 1}?`} confirmLabel="Remove area"
        onConfirm={() => removing !== null && remove(removing)} onCancel={() => setRemoving(null)}
      >
        The shape comes off this planting event. Any other areas stay.
      </ConfirmDialog>
    </div>
  );
}

const count = (n: number) => `${n} planted ${n === 1 ? "area" : "areas"}`;
const total = (areas: LngLat[][]) => formatHectares(areas.reduce((t, a) => t + hectares(a), 0));

/** What the pill says: the area once there is one (`lead`), then the next step. */
function message(method: DrawMethod, n: number, closed: boolean, tracing: boolean, ha: string): { lead?: string; rest: string } {
  if (closed) return { lead: ha, rest: "drag corners to adjust" };
  if (method === "trace") return { rest: tracing ? "Keep going round · lift to finish" : "Trace round the planted area in one go" };
  if (n === 0) return { rest: "Tap the first corner of the planted area" };
  if (n < 3) return { rest: `Tap corner ${n + 1} · ${3 - n} more to make a shape` };
  return { lead: ha, rest: "tap the first corner, or Done" };
}
