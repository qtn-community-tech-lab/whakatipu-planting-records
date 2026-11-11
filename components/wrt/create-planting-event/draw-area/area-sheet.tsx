"use client";
/**
 * What the sheet shows when a drawn area that's already brought forward is tapped again on the map:
 * planting in that area. One main button lists its plants (the form's "What was planted", on it);
 * a small link lists plants for the site as a whole instead (in no area; the area stays drawn).
 */
import { ArrowRight, Sprout } from "lucide-react";
import { AreaShape } from "@/components/wrt/shared/area-shape";
import { formatHectares, hectares } from "@/lib/wrt/areas/planted-area";
import { formatNumber } from "@/lib/wrt/text";
import type { Area } from "./use-draw-area";
import f from "@/components/wrt/events/map-event-form.module.css";

export function AreaSheet({ area, site, plants, onPlant, onWholeSite }: {
  area: Area;
  /** Where the area is (the part, or the site), for the way back to it; none while the area has no site yet. */
  site?: string | undefined;
  /** Plants already listed in this area. */
  plants: number;
  /** List what was planted in it. */
  onPlant: () => void;
  /** List plants for the site as a whole, in no area: the area stays drawn. */
  onWholeSite: () => void;
}) {
  return (
    <div className="grid gap-3.5 py-[18px]">
      <div className={f.card}>
        <AreaShape pts={area.pts} size={56} onMap />
        <span className={f.cardText}>
          <b>Planting in this area</b>
          <span>{formatHectares(hectares(area.pts))} · {plants ? `${formatNumber(plants)} plants` : "No plants yet"}</span>
        </span>
      </div>
      <button type="button" className={f.next} onClick={onPlant}>
        <Sprout size={18} strokeWidth={2.4} aria-hidden="true" />
        {plants ? "Change plants" : "Add plants"}
        <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <button type="button" className={`${f.inlineLink} justify-self-center`} onClick={onWholeSite}>
        {site ? `Plant at the whole of ${site} instead` : "Plant at the whole site instead"}
      </button>
    </div>
  );
}
