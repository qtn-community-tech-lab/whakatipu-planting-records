"use client";
/**
 * The bar along the bottom of the map.
 *   Drawing: one pill that says the next step, with Undo, Start again (or Remove, when changing
 *     a kept area), Done and Stop. Until the first corner goes down, a switch between tapping
 *     corners and tracing. Once there's a shape, a field above the pill names it: Done needs a name.
 *   Not drawing: a dock. The site's part (a menu of its parts, New sublocation and All sites), the number of
 *     areas kept (tap it to step into them) and a pencil that draws one.
 *   An area brought forward (from the dock, or tapped on the map): a stepper. Back and next go
 *     through the areas on the map; above it, Change shape and Add plants for the one in view.
 * Wide screens leave out the dock and the stepper (dock false): the panel lists the areas, the map has a toolbar.
 * Every control is a labelled button, and each step is read out by screen readers.
 */
import { ChevronLeft, ChevronRight, ChevronUp, Lasso, MapPin, Pencil, Pentagon, RotateCcw, Sprout, Trash2, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AreaShape } from "@/components/wrt/shared/area-shape";
import { PartMenu } from "../part-menu";
import { NAME_FIELD } from "@/components/wrt/shared/fields";
import { formatHectares, hectares } from "@/lib/wrt/areas/planted-area";
import { plantsOrNone } from "@/lib/wrt/text";
import type { Area, DrawArea, DrawMethod } from "./use-draw-area";
import s from "./draw-area.module.css";

const METHODS: { id: DrawMethod; label: string }[] = [
  { id: "corners", label: "Tap corners" },
  { id: "trace", label: "Trace" },
];

export function DrawBar({ draw, onAdd, onStop, onShow, onClose, onPlant, siteName, partName, parts, part, onChoosePart, onChangeSite, onAllSites, onAddPart, placeLocked, onSite, choosing = false, onToggleSite, plants, shown, dock = true, style }: {
  draw: DrawArea;
  /** The area brought forward on the map (its id): the bar steps through the areas from it. */
  shown: number | null;
  /** Go to an area on the map and bring it forward (its id). */
  onShow: (id: number) => void;
  /** Let the area go: back to the dock. */
  onClose: () => void;
  /** List what was planted in an area (its id): the form's "What was planted", on that area. Left out once the event is saved. */
  onPlant?: ((id: number) => void) | undefined;
  /** Plants entered for each area (by area id), from the form's "What was planted". */
  plants: Record<number, number>;
  /** The event's site, and its part beside the site's name ("Roadside"); no part is the site as a whole. */
  siteName?: string | undefined;
  partName?: string | undefined;
  /** The site's parts, for the part's menu, and the chosen one's id. */
  parts: { id: string; name: string }[];
  part: string | null;
  /** Another part of this site (null: the site as a whole). */
  onChoosePart: (id: string | null) => void;
  /** Another site (the site chooser). */
  onChangeSite: () => void;
  /** The part menu's All sites: leave the site for every site. */
  onAllSites: () => void;
  /** The part menu's New sublocation, where it's offered. */
  onAddPart?: (() => void) | undefined;
  /** The place can't change now (the event's row is saved without its plants): the part shows, without its menu. */
  placeLocked?: boolean | undefined;
  /** With the menu locked, tapping the site goes to its page (a new location in progress). */
  onSite?: (() => void) | undefined;
  /** With no site, the dock's Choose a site: opens the chooser, or closes it when it's open (`choosing`). */
  choosing?: boolean | undefined;
  onToggleSite?: (() => void) | undefined;
  /** Draw another area (the host drops the phone sheet first). */
  onAdd: () => void;
  /** Stop drawing, keeping nothing new (the host may bring its list back). */
  onStop: () => void;
  /** False: only the drawing pill (wide screens, where the panel and the map's toolbar do the rest). */
  dock?: boolean | undefined;
  /** Where it sits: the host knows how tall the phone sheet is. */
  style?: CSSProperties | undefined;
}) {
  const { areas, draft } = draw;
  const site = siteName && partName ? `${siteName} · ${partName}` : siteName;
  // The area brought forward, and stepping to the one before or after it (round again at the ends).
  const ati = areas.findIndex((a) => a.id === shown);
  const at = ati < 0 ? undefined : areas[ati];
  const atHa = at ? formatHectares(hectares(at.pts)) : "";
  const atCount = at ? plants[at.id] : undefined;
  const atPlants = plantsOrNone(atCount ?? 0);
  // Only shown with an area brought forward, so the list isn't empty.
  const step = (by: number) => onShow(areas[(ati + by + areas.length) % areas.length]!.id);
  const [removing, setRemoving] = useState<number | null>(null);
  // What a screen reader hears when drawing ends or an area comes off.
  const [said, setSaid] = useState("");
  const bar = useRef<HTMLDivElement>(null);

  // When the bar changes, the button tapped may go with it: focus goes to the new one marked
  // data-focus (the area in the stepper; in the dock, the areas, or the pencil with none), not the page.
  // With no dock: the area's row in the panel's list after changing its shape, else the button that draws
  // (data-draws: the map's toolbar, or the header's + on phones) that shows.
  function focusNext(changed?: number) {
    const row = changed === undefined ? null : document.querySelector<HTMLElement>(`[data-area-row="${changed}"]`);
    (bar.current?.querySelector<HTMLElement>("[data-focus]") ?? row ?? [...document.querySelectorAll<HTMLElement>("[data-draws]")].find((b) => b.offsetParent))?.focus();
  }
  // The area being changed (its id), remembered past the end of drawing.
  const changing = useRef<number | undefined>(undefined);
  useEffect(() => { if (draft) changing.current = draft.editing === null ? undefined : areas[draft.editing]?.id; }, [draft, areas]);
  const mode = draft ? "draw" : at ? "step" : "dock";
  const wasMode = useRef(mode);
  useEffect(() => {
    if (wasMode.current === "draw" && mode !== "draw") {
      setSaid(areas.length ? `${count(areas.length)}, ${total(areas)}${site ? `, at ${site}` : ""}` : "Stopped drawing");
      focusNext(changing.current);
    } else if (dock && wasMode.current !== mode && mode !== "draw" && document.activeElement === document.body) focusNext();
    wasMode.current = mode;
  }, [mode, areas, site, dock]);

  function remove(i: number) {
    setRemoving(null);
    draw.remove(i);
    setSaid(`${label(areas[i], i)} removed`);
  }

  const n = draft?.pts.length ?? 0;
  const ha = n >= 3 ? formatHectares(hectares(draft!.pts)) : "";
  const named = !!draft?.name.trim();
  const say = draft ? message(draft.method, n, draft.closed, !!draw.trace, ha, named) : null;

  return (
    <div ref={bar} className={s.bar} style={style}>
      <p className={s.sr} aria-live="polite">{say ? [say.lead, say.rest].filter(Boolean).join(", ") : said}</p>
      {draft ? (
        <>
          <div className={s.pill} role="group" aria-label={draft.editing === null ? "Drawing an area" : `Changing ${label(areas[draft.editing], draft.editing)}`}>
            <span className={s.msg} aria-hidden="true">
              {say!.lead && <><span className={s.num}>{say!.lead}</span> · </>}{say!.rest}
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
              <button type="button" className={s.pillGo} onClick={() => draw.done()} disabled={n < 3 || !named}>Done</button>
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
          {n >= 3 && !draw.trace && (
            <label className={s.nameField} data-missing={named ? undefined : ""}>
              <span className="sr-only">Label this area (needed to finish)</span>
              <Pencil size={15} strokeWidth={2.4} aria-hidden="true" />
              <input
                name="polygon-label" value={draft.name} placeholder="Area label, e.g. School field" maxLength={60} {...NAME_FIELD} enterKeyHint="done" required
                onChange={(e) => draw.rename(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); draw.done(); } }}
              />
            </label>
          )}
        </>
      ) : !dock ? null : at ? (
        <>
          <div className={s.dock} role="group" aria-label={`${label(at, ati)}: area ${ati + 1} of ${areas.length}`}>
            <button type="button" className={s.stepBtn} onClick={() => step(-1)} disabled={areas.length < 2} aria-label="Previous area">
              <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
            {/* A tap goes back to it on the map: the map may have moved. */}
            <button type="button" className={s.areaBtn} data-focus="" onClick={() => onShow(at.id)} aria-label={`${label(at, ati)}, ${atHa}, ${atPlants.toLowerCase()}: show on the map`}>
              <AreaShape pts={at.pts} size={32} />
              <span className={s.areaText}>
                <b>{at.name || atHa}</b>
                <small>{areas.length > 1 ? `${ati + 1} of ${areas.length} · ` : at.name ? `${atHa} · ` : ""}{atPlants}</small>
              </span>
            </button>
            <button type="button" className={s.stepBtn} onClick={() => step(1)} disabled={areas.length < 2} aria-label="Next area">
              <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
            <button type="button" className={s.closeBtn} onClick={onClose} aria-label="Close: stop showing this area">
              <X size={18} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          {/* Last in the code, first on screen (the bar stacks upwards): what to do with the area in view. */}
          <div className={s.actions}>
            <button type="button" onClick={() => draw.start(ati)}>
              <Pencil size={16} strokeWidth={2.4} aria-hidden="true" />Change shape
            </button>
            {onPlant && (
              <button type="button" onClick={() => onPlant(at.id)}>
                <Sprout size={16} strokeWidth={2.4} aria-hidden="true" />{plants[at.id] ? "Change plants" : "Add plants"}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className={s.dock} role="group" aria-label="Map tools">
            {siteName && placeLocked ? (
              <button type="button" className={s.partBtn} disabled={!onSite} onClick={onSite}>
                <MapPin size={16} strokeWidth={2.2} aria-hidden="true" />
                <span className={s.areaText}><b>{partName ?? siteName}</b><small>{partName ? siteName : "Whole site"}</small></span>
              </button>
            ) : siteName ? (
              <PartMenu siteName={siteName} parts={parts} part={part} onChoosePart={onChoosePart} onAddPart={onAddPart} onAllSites={onAllSites} side="top" className={s.partBtn} label={`${site}: change the part`}>
                <MapPin size={16} strokeWidth={2.2} aria-hidden="true" />
                <span className={s.areaText}>
                  <b>{partName ?? siteName}</b>
                  <small>{partName ? siteName : "Whole site"}</small>
                </span>
                <ChevronUp size={16} strokeWidth={2.4} aria-hidden="true" />
              </PartMenu>
            ) : (
              <button type="button" className={s.partBtn} data-missing={areas.length ? "" : undefined} onClick={onToggleSite ?? onChangeSite} aria-expanded={choosing}>
                <MapPin size={16} strokeWidth={2.2} aria-hidden="true" />
                <span className={s.areaText}>
                  <b>Choose a site</b>
                  {areas.length > 0 && <small>{areas.length === 1 ? "Your area needs one" : "Your areas need one"}</small>}
                </span>
              </button>
            )}
            {/* The areas: a tap steps into them, at the first. */}
            {areas.length > 0 && (
              <button type="button" data-focus="" onClick={() => onShow(areas[0]!.id)} aria-label={`${count(areas.length)}, ${total(areas)}: go through them`}>
                <Pentagon size={16} strokeWidth={2.4} aria-hidden="true" /><b>{areas.length}</b>
              </button>
            )}
            <button type="button" className={s.addBtn} data-focus={areas.length ? undefined : ""} onClick={onAdd} aria-label="Draw area">
              <Pencil size={18} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
      <ConfirmDialog
        open={removing !== null} title={`Remove ${removing !== null ? label(areas[removing], removing) : "area"}?`} confirmLabel="Remove area"
        onConfirm={() => removing !== null && remove(removing)} onCancel={() => setRemoving(null)}
      >
        The shape comes off this planting event. Any other areas stay{areas.length > 1 ? ", and plants listed in it move to the first of them" : ""}.
      </ConfirmDialog>
    </div>
  );
}

/** What an area is called: its name, or "Area 2" (only for an area kept before names were needed). */
const label = (a: Area | undefined, i: number) => a?.name || `Area ${i + 1}`;
const count = (n: number) => `${n} ${n === 1 ? "area" : "areas"}`;
const total = (areas: Area[]) => formatHectares(areas.reduce((t, a) => t + hectares(a.pts), 0));

/** What the pill says: the area once there is one (`lead`), then the next step. */
function message(method: DrawMethod, n: number, closed: boolean, tracing: boolean, ha: string, named: boolean): { lead?: string | undefined; rest: string } {
  if (closed) return { lead: ha, rest: named ? "drag corners to adjust, or Done" : "name it to finish" };
  if (method === "trace") return { rest: tracing ? "Keep going round · lift to finish" : "Trace round the planted area in one go" };
  if (n === 0) return { rest: "Tap the first corner of the planted area" };
  if (n < 3) return { rest: `Tap corner ${n + 1} · ${3 - n} more to make a shape` };
  return { lead: ha, rest: named ? "tap the first corner, or Done" : "tap the first corner, then name it" };
}
