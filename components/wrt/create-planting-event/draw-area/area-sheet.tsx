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

export function AreaSheet({ area, plants, onPlant, onWholeSite, onClose }: {
  area: Area;
  /** Plants already listed in this area. */
  plants: number;
  /** List what was planted in it. Both left out once the event is saved. */
  onPlant?: (() => void) | undefined;
  /** List plants for the site as a whole, in no area: the area stays drawn. */
  onWholeSite?: (() => void) | undefined;
  /** Back to what was showing before the sheet. */
  onClose: () => void;
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
      <div className="flex items-center gap-2.5">
        <button type="button" className={f.back} onClick={onClose}>Close</button>
        {onPlant && (
          <button type="button" className={f.next} onClick={onPlant}>
            <Sprout size={18} strokeWidth={2.4} aria-hidden="true" />
            {plants ? "Change plants" : "Add plants"}
            <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        )}
      </div>
      {onWholeSite && (
        <button type="button" className={`${f.inlineLink} justify-self-center`} onClick={onWholeSite}>
          {/* As the plant list calls it: Whole site, plants in no drawn area. */}
          Plant at Whole site instead, in no drawn area
        </button>
      )}
    </div>
  );
}
