"use client";
/**
 * What the sheet shows when a drawn area already brought forward is tapped again on the map: planting in that area.
 */
import { ArrowRight, Sprout } from "lucide-react";
import { AreaShape } from "@/components/wrt/shared/area-shape";
import { formatHectares, hectares } from "@/lib/wrt/areas/planted-area";
import { plantsOrNone } from "@/lib/wrt/text";
import type { Area } from "./use-draw-area";
import * as panel from "../panel-classes";

export function AreaSheet({ area, plants, onPlant, onWholeSite, onClose }: {
  area: Area;
  plants: number;
  /** Both left out once the event is saved. */
  onPlant?: (() => void) | undefined;
  /** List plants for the site as a whole, in no area: the area stays drawn. */
  onWholeSite?: (() => void) | undefined;
  onClose: () => void;
}) {
  return (
    <div className="grid gap-3.5 py-[18px]">
      <div className={panel.card}>
        <AreaShape pts={area.pts} size={56} onMap />
        <span className={panel.cardText}>
          <b>Planting in this area</b>
          <span>{formatHectares(hectares(area.pts))} · {plantsOrNone(plants)}</span>
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <button type="button" className={panel.back} onClick={onClose}>Close</button>
        {onPlant && (
          <button type="button" className={panel.next} onClick={onPlant}>
            <Sprout size={18} strokeWidth={2.4} aria-hidden="true" />
            {plants ? "Change plants" : "Add plants"}
            <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
        )}
      </div>
      {onWholeSite && (
        <button type="button" className={`${panel.inlineLink} justify-self-center`} onClick={onWholeSite}>
          {/* As the plant list calls it: Whole site, plants in no drawn area. */}
          Plant at Whole site instead, in no drawn area
        </button>
      )}
    </div>
  );
}
