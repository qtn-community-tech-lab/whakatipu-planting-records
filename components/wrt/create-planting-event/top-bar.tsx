"use client";
import { ArrowLeft, ChevronDown, MapPin, Pentagon, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import s from "./create-planting-event.module.css";

/**
 * The session header over the map: a back button, the site in the middle (tap it to change the
 * site, like the form's title), and a + menu for adding to the map: a new location, or (next) a
 * drawn area. It's the one place to add to the map.
 */
export function TopBar({ siteName, exitHref, onChooseSite, onAddLocation, onDrawArea }: {
  siteName?: string | undefined; exitHref: string; onChooseSite: () => void; onAddLocation: () => void; onDrawArea: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const pick = (fn: () => void) => () => { setMenu(false); fn(); };
  return (
    <div className={s.top}>
      <Link href={exitHref} className={s.exit} aria-label="Leave the map">
        <ArrowLeft size={20} strokeWidth={2.4} />
      </Link>
      <button type="button" className={s.session} onClick={onChooseSite} aria-label={siteName ? `${siteName}: change site` : "Choose a site"}>
        <MapPin size={16} strokeWidth={2.2} />
        <b>{siteName ?? "Choose a site"}</b>
        <ChevronDown size={16} strokeWidth={2.4} />
      </button>
      <Popover open={menu} onOpenChange={setMenu}>
        <PopoverTrigger className={s.add} aria-label="Add to the map">
          <Plus size={20} strokeWidth={2.6} />
        </PopoverTrigger>
        {/* Opens rightwards, into the map, so on desktop it never covers the form; on phones it shifts back on screen. */}
        <PopoverContent align="start" sideOffset={8} collisionPadding={12} className={s.addMenu}>
          <button type="button" onClick={pick(onAddLocation)}>
            <MapPin size={18} strokeWidth={2.2} />
            New location
          </button>
          <button type="button" onClick={pick(onDrawArea)}>
            <Pentagon size={18} strokeWidth={2.2} />
            Draw area <span className={s.soon}>Next</span>
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
