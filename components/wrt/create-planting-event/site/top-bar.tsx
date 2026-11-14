"use client";
import { LocateFixed, MapPin, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import s from "../create-planting-event.module.css";

/**
 * The session header over the map on phones: the site in the middle (tap it to change the site) and a + menu for
 * adding to the map. Wide screens show none of it. The menus are modal, so the tap that closes one doesn't also
 * land on the map (which would leave the site).
 */
export function TopBar({ siteName, hint, choosing, onChooseSite, onDrawArea, onFindMe }: {
  siteName?: string | undefined;
  /** Under the site: the part, or "New planting event" once one is started. */
  hint?: string | undefined;
  choosing: boolean; onChooseSite: () => void;
  onDrawArea: () => void;
  onFindMe: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const pick = (fn: () => void) => () => { setMenu(false); fn(); };
  return (
    <div className={s.top}>
      <div className={s.session}>
        <button type="button" className={s.sessionMain} onClick={onChooseSite} aria-expanded={choosing} aria-label={siteName ? `${siteName}${hint ? `, ${hint}` : ""}: change site` : "Choose a site"}>
          <MapPin size={16} strokeWidth={2.2} />
          <span className={s.sessionText}>
            <b>{siteName ?? "Choose a site"}</b>
            {hint && <small>{hint}</small>}
          </span>
        </button>
      </div>
      <Popover open={menu} onOpenChange={setMenu} modal>
        <PopoverTrigger className={s.add} aria-label="Add to the map" data-draws="">
          <Plus size={20} strokeWidth={2.6} />
        </PopoverTrigger>
        {/* Opens rightwards, into the map, so on desktop it never covers the form; on phones it shifts back on screen. */}
        <PopoverContent align="start" sideOffset={8} collisionPadding={12} className={s.addMenu}>
          <button type="button" onClick={pick(onDrawArea)}>
            <Pencil size={18} strokeWidth={2.4} />
            Draw area
          </button>
          <button type="button" onClick={pick(onFindMe)}>
            <LocateFixed size={18} strokeWidth={2.2} />
            Find me
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
