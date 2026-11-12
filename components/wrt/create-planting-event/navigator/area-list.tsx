"use client";
import { ChevronDown, Pencil, Pentagon, Sprout } from "lucide-react";
import { useState } from "react";
import { AreaShape } from "@/components/wrt/shared/area-shape";
import { formatHectares, hectares } from "@/lib/wrt/areas/planted-area";
import { plantsOrNone } from "@/lib/wrt/text";
import type { Area } from "../draw-area";
import s from "./navigator.module.css";

/**
 * The drawn areas, in the wide panel under the title. A row per area; a click goes to it
 * on the map and lights it, and the lit one shows Change shape and Add plants. Before the form is started the list
 * is open; past it, one line ("3 areas · 0.7 ha") that opens it, so the form keeps the room.
 * Up and down move between rows (useMapKeys).
 */
export function AreaList({ areas, shown, plants, notStarted, drawing, onShow, onReshape, onPlant, onDraw }: {
  areas: Area[];
  /** The area brought forward on the map (its id). */
  shown: number | null;
  /** Plants listed in each area, by id. */
  plants: Record<number, number>;
  notStarted: boolean;
  drawing: boolean;
  onShow: (id: number) => void;
  /** Change the shape of the area at this place in the list. */
  onReshape: (i: number) => void;
  /** Left out once the event is saved. */
  onPlant?: ((id: number) => void) | undefined;
  onDraw: () => void;
}) {
  // Opened or closed by hand, before or after the form started; the other side of that goes back to the rule.
  const [toggled, setToggled] = useState<{ notStarted: boolean; open: boolean } | null>(null);
  const open = toggled?.notStarted === notStarted ? toggled.open : notStarted;
  if (!areas.length) return null;
  const ha = formatHectares(areas.reduce((t, a) => t + hectares(a.pts), 0));
  const plantsOf = (id: number) => plantsOrNone(plants[id] ?? 0);

  return (
    <section className={s.list} aria-label="Planted areas">
      <div className={s.listHead}>
        <button type="button" className={s.listToggle} aria-expanded={open} onClick={() => setToggled({ notStarted, open: !open })}>
          <Pentagon size={16} strokeWidth={2.4} aria-hidden="true" />
          <b>{areas.length} {areas.length === 1 ? "area" : "areas"}</b> · {ha}
          <ChevronDown size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <button type="button" className={s.listDraw} onClick={onDraw} disabled={drawing}>
          <Pencil size={15} strokeWidth={2.4} aria-hidden="true" />Draw area
        </button>
      </div>
      {open && (
        <ul data-area-list="">
          {areas.map((a, i) => {
            const on = a.id === shown;
            const name = a.name || `Area ${i + 1}`;
            return (
              <li key={a.id} data-on={on || undefined}>
                <button type="button" className={s.row} data-area-row={a.id} aria-current={on || undefined} onClick={() => onShow(a.id)} aria-label={`${name}, ${formatHectares(hectares(a.pts))}, ${plantsOf(a.id).toLowerCase()}: show on the map`}>
                  <AreaShape pts={a.pts} size={32} />
                  <span className={s.rowText}>
                    <b>{name}</b>
                    <small>{formatHectares(hectares(a.pts))} · {plantsOf(a.id)}</small>
                  </span>
                </button>
                {on && !drawing && (
                  <span className={s.rowActions}>
                    <button type="button" onClick={() => onReshape(i)}>
                      <Pencil size={15} strokeWidth={2.4} aria-hidden="true" />Change shape
                    </button>
                    {onPlant && (
                      <button type="button" onClick={() => onPlant(a.id)}>
                        <Sprout size={15} strokeWidth={2.4} aria-hidden="true" />{plants[a.id] ? "Change plants" : "Add plants"}
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
