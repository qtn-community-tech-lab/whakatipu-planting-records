"use client";
import { ArrowLeft, ChevronDown, MapPin, Pentagon, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import s from "./create-planting-event.module.css";

/**
 * The session header over the map: a back button, the site in the middle (tap it to change the
 * site, like the form's title; a line under it says where you are in the form, and × leaves the
 * site for every site), and a + menu for adding to the map: a new location, or a drawn area.
 * It's the only way to add to the map from the header. Wide screens show only the back button: the panel's
 * breadcrumb and the map's toolbar do the rest (create-planting-event.module.css).
 */
export function TopBar({ siteName, hint, exitHref, choosing, onChooseSite, onLeaveSite, onAddLocation, onDrawArea }: {
  siteName?: string | undefined;
  /** Under the site: the part, or the step the form is on. */
  hint?: string | undefined;
  exitHref: string;
  /** The site chooser is open: the site's chevron points up, and a tap closes it. */
  choosing: boolean; onChooseSite: () => void;
  /** Back to every site (asks first mid-event). Only with a site. */
  onLeaveSite?: (() => void) | undefined;
  /** Left out once an area is drawn: a pin as well would only confuse where it was planted. */
  onAddLocation?: (() => void) | undefined; onDrawArea: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const pick = (fn: () => void) => () => { setMenu(false); fn(); };
  return (
    <div className={s.top}>
      <Link href={exitHref} className={s.exit} aria-label="Leave the map">
        <ArrowLeft size={20} strokeWidth={2.4} />
      </Link>
      <div className={s.session}>
        <button type="button" className={s.sessionMain} onClick={onChooseSite} aria-expanded={choosing} aria-label={siteName ? `${siteName}${hint ? `, ${hint}` : ""}: change site` : "Choose a site"}>
          <MapPin size={16} strokeWidth={2.2} />
          <span className={s.sessionText}>
            <b>{siteName ?? "Choose a site"}</b>
            {hint && <small>{hint}</small>}
          </span>
          <ChevronDown size={16} strokeWidth={2.4} />
        </button>
        {siteName && onLeaveSite && (
          <button type="button" className={s.sessionLeave} onClick={onLeaveSite} aria-label="Leave this site: back to every site">
            <X size={16} strokeWidth={2.6} />
          </button>
        )}
      </div>
      <Popover open={menu} onOpenChange={setMenu}>
        <PopoverTrigger className={s.add} aria-label="Add to the map" data-draws="">
          <Plus size={20} strokeWidth={2.6} />
        </PopoverTrigger>
        {/* Opens rightwards, into the map, so on desktop it never covers the form; on phones it shifts back on screen. */}
        <PopoverContent align="start" sideOffset={8} collisionPadding={12} className={s.addMenu}>
          {onAddLocation && (
            <button type="button" onClick={pick(onAddLocation)}>
              <MapPin size={18} strokeWidth={2.2} />
              New location
            </button>
          )}
          <button type="button" onClick={pick(onDrawArea)}>
            <Pentagon size={18} strokeWidth={2.2} />
            Draw area
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
