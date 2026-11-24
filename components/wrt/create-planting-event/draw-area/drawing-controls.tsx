"use client";

import { Lasso, Pencil, Pentagon, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import { NAME_FIELD } from "@/components/wrt/shared/fields";
import { formatHectares, hectares } from "@/lib/wrt/areas/planted-area";
import type { DrawArea, DrawMethod } from "./use-draw-area";
import s from "./draw-area.module.css";

const METHODS: { id: DrawMethod; label: string }[] = [
  { id: "corners", label: "Tap corners" },
  { id: "trace", label: "Trace" },
];

export function DrawingControls({
  draw, onStop, onRemove, label, requireName = true, canSaveBoundary = false,
  subject = "planted area", doneLabel = "Done",
}: {
  draw: DrawArea;
  onStop: () => void;
  onRemove?: (() => void) | undefined;
  label: string;
  requireName?: boolean;
  canSaveBoundary?: boolean;
  subject?: string;
  doneLabel?: string;
}) {
  const { draft, trace } = draw;
  if (!draft) return null;
  const n = draft.pts.length;
  const ha = n >= 3 ? formatHectares(hectares(draft.pts)) : "";
  const named = !requireName || !!draft.name.trim();
  const say = message(draft.method, n, draft.closed, !!trace, ha, named, canSaveBoundary, subject, doneLabel);

  return (
    <>
      <p className={s.sr} aria-live="polite">{[say.lead, say.rest].filter(Boolean).join(", ")}</p>
      <div className={s.pill} role="group" aria-label={label}>
        <span className={s.msg} aria-hidden="true">
          {say.lead && <><span className={s.num}>{say.lead}</span> · </>}{say.rest}
        </span>
        <div className={s.pillButtons}>
          <button type="button" className={s.pillBtn} onClick={draw.undo} disabled={!draw.canUndo} title="Undo">
            <Undo2 size={16} strokeWidth={2.4} aria-hidden="true" /><span className={s.buttonLabel}>Undo</span>
          </button>
          {onRemove ? (
            <button type="button" className={`${s.pillBtn} ${s.danger}`} onClick={onRemove}>
              <Trash2 size={16} strokeWidth={2.4} aria-hidden="true" />Remove
            </button>
          ) : n > 0 && (
            <button type="button" className={s.pillBtn} onClick={draw.startAgain} title="Start again">
              <RotateCcw size={16} strokeWidth={2.4} aria-hidden="true" /><span className={s.buttonLabel}>Start again</span>
            </button>
          )}
          <button type="button" className={s.pillGo} onClick={() => draw.done()} disabled={n < 3 || !named || !!draw.trace}>{doneLabel}</button>
          <button type="button" className={s.pillCancel} onClick={onStop} aria-label="Stop drawing, keep nothing new" title="Stop drawing">
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
      {/* Last in the code, first on screen (the bar stacks upwards): above the pill, so the name comes before Done.
          Needed: with several areas at a big site, the name is how they're told apart. */}
      {requireName && n >= 3 && !draw.trace && (
        <label className={s.nameField} data-missing={named ? undefined : ""}>
          <span className="sr-only">{canSaveBoundary ? "Planting sketch name (needed for Done)" : "Label this area (needed to finish)"}</span>
          <Pencil size={15} strokeWidth={2.4} aria-hidden="true" />
          <input
            name="polygon-label" value={draft.name} placeholder={canSaveBoundary ? "Planting sketch name" : "Area name, e.g. School field"} maxLength={60} {...NAME_FIELD} enterKeyHint="done" required
            onChange={(e) => draw.rename(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); draw.done(); } }}
          />
        </label>
      )}
    </>
  );
}

/** What the pill says: the area once there is one (`lead`), then the next step. */
function message(method: DrawMethod, n: number, closed: boolean, tracing: boolean, ha: string, named: boolean, canSaveBoundary: boolean, subject: string, doneLabel: string): { lead?: string | undefined; rest: string } {
  if (canSaveBoundary) return { lead: ha, rest: closed ? "Drag corners to adjust, or save the boundary" : "Tap another corner, or save the boundary" };
  if (closed) return { lead: ha, rest: named ? `Drag corners to adjust, or ${doneLabel}` : "Name your new area to finish" };
  if (method === "trace") return { rest: tracing ? "Keep going round · lift to finish" : `Trace round the ${subject} in one go` };
  if (n === 0) return { rest: `Tap the first corner of the ${subject}` };
  if (n < 3) return { rest: `Tap corner ${n + 1} · ${3 - n} more to make a shape` };
  return { lead: ha, rest: named ? `Tap the first corner, or ${doneLabel}` : "Tap the map to start drawing, then name it" };
}
