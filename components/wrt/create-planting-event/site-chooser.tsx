"use client";
/**
 * Choose where: a search, then every site as an accordion (Radix, one open at a
 * time, animated) that opens to "The site as a whole" and its parts. A site with
 * no parts is a single row; an open site ends with New sublocation (a pin dropped on the map as a
 * part of it). It takes the panel's place while it's open (the phone sheet
 * goes full screen for it), so there is one sheet, never a dialog over it. Escape or × closes it.
 * For a new pin or a drawn area (`forNew`) it asks which site that belongs to instead.
 */
import { ChevronDown, MapPinPlus, Plus } from "lucide-react";
import { Accordion } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { plantsAndSpecies, type PlantTotals } from "@/components/wrt/events/map-event-form";
import type { SiteOption } from "@/lib/wrt/events/form-options";
import { rankMatches } from "@/lib/wrt/text";
import f from "@/components/wrt/events/map-event-form.module.css";
import { ListRow } from "@/components/wrt/shared/list-row";
import { SearchField } from "@/components/wrt/shared/search-field";
import { AddToMap } from "./add-to-map";
import add from "./add-to-map.module.css";
import s from "./site-chooser.module.css";

export function SiteChooser({ sites, totals, value, onChoose, onClose, forNew, onKeepNew, onAddLocation, onAddSublocation, onDrawArea }: {
  sites: readonly SiteOption[];
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"). */
  totals: PlantTotals;
  /** The current choice, marked in the list. */
  value: { slug: string; parcelId: string | null };
  onChoose: (slug: string, parcelId: string | null) => void;
  onClose: () => void;
  /** A new pin, or an area drawn but not at any site yet: the chooser asks for its site. */
  forNew?: { what: "area" | "location"; atSite: boolean } | undefined;
  /** A new location: keep it as a new site of its own, at no site we know. */
  onKeepNew?: (() => void) | undefined;
  /** A location that isn't in the list: drop a pin, or draw its area. */
  onAddLocation?: (() => void) | undefined;
  onDrawArea?: (() => void) | undefined;
  /** A new part of a site: drop a pin on the map as a sublocation of it. */
  onAddSublocation?: ((siteSlug: string) => void) | undefined;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const q = query.trim();
  // The open site: the chosen one to start with, then whichever is tapped. Typing doesn't change it.
  const [open, setOpen] = useState(value.slug);
  // Opened in the panel's place: the heading takes focus, so screen readers hear the question.
  useEffect(() => heading.current?.focus(), []);

  // With a search: sites that match, or that have a part that matches (only those parts shown).
  // Browsing, the chosen site comes first: switching part at it is the usual reason to be here.
  const shown = sites.flatMap((site) => {
    const siteHit = !q || rankMatches([site], q).length > 0;
    const parts = q && !siteHit ? rankMatches(site.parts, q) : site.parts;
    return siteHit || parts.length ? [{ site, parts }] : [];
  }).sort((a, b) => Number(b.site.slug === value.slug) - Number(a.site.slug === value.slug));

  const amount = (key: string) => plantsAndSpecies(totals[key]);

  const rows = () => shown.map(({ site, parts }) => {
    const chosenHere = value.slug === site.slug;
    if (site.parts.length === 0) {
      return <ul key={site.slug} className={s.chooserRow}>{option(site.name, site.slug, null, amount(site.slug))}</ul>;
    }
    const chosenPart = chosenHere ? site.parts.find((p) => p.id === value.parcelId)?.name ?? "The site as a whole" : null;
    return (
      <Accordion.Item key={site.slug} value={site.slug} className={s.chooserItem}>
        <Accordion.Header className={s.chooserHeader}>
          <Accordion.Trigger asChild>
            <ListRow
              className={s.chooserTrigger} title={site.name}
              subtitle={
                chosenPart ? `Chosen: ${chosenPart}`
                : q && parts.length < site.parts.length ? `${parts.length} matching ${parts.length === 1 ? "part" : "parts"}`
                : `${amount(site.slug)} · ${site.parts.length} ${site.parts.length === 1 ? "part" : "parts"}`
              }
              end={<ChevronDown size={16} strokeWidth={2.4} />}
            />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className={s.chooserContent}>
          <ul>
            {(!q || rankMatches([site], q).length > 0) && option("The site as a whole", site.slug, null, amount(site.slug))}
            {parts.map((p) => option(p.name, site.slug, p.id, amount(`${site.slug}/${p.id}`)))}
            {onAddSublocation && !q && (
              <li>
                <button type="button" className={s.choice} onClick={() => onAddSublocation(site.slug)}>
                  <span className={s.chooserText}><b className={s.addPart}><Plus size={16} strokeWidth={2.6} aria-hidden="true" />New sublocation of {site.name}</b></span>
                </button>
              </li>
            )}
          </ul>
        </Accordion.Content>
      </Accordion.Item>
    );
  });

  const option = (label: string, slug: string, parcelId: string | null, sub?: string) => {
    const on = value.slug === slug && value.parcelId === parcelId;
    return (
      <li key={parcelId ?? "whole"}>
        <ListRow
          className={s.choice} aria-pressed={on} onClick={() => onChoose(slug, parcelId)}
          title={label} subtitle={sub} end={on && <span className={s.choiceOn}>Chosen</span>}
        />
      </li>
    );
  };

  return (
    <section className={f.form} aria-labelledby="site-chooser-title" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className={f.scroll}>
        <header className={s.chooserHead}>
          <h2 ref={heading} id="site-chooser-title" tabIndex={-1}>{forNew ? `Which site is this ${forNew.what === "area" ? "area" : "new location"} at?` : "Choose a site"}</h2>
          <button type="button" className={s.chooserClose} aria-label="Close" onClick={onClose}>×</button>
        </header>
        {forNew?.what === "area" && <p className={s.chooserNote}>The area you drew isn&apos;t near a site we know. Choose its site, or add it as a new location.</p>}
        {forNew?.what === "location" && !forNew.atSite && <p className={s.chooserNote}>The pin you dropped isn&apos;t near a site we know. Choose the site it belongs to, or keep it as a new site.</p>}
        {forNew?.what === "location" && onKeepNew && (
          <button type="button" className={add.button} onClick={onKeepNew}>
            <MapPinPlus size={20} strokeWidth={2.2} aria-hidden="true" />{forNew.atSite ? "Make it a new site instead" : "Keep it as a new site"}
          </button>
        )}
        {/* Another area wouldn't answer the question, so only New location while asking about an area;
            with a new location already dropped, neither (another one would just replace it). */}
        {forNew?.what !== "location" && <AddToMap onAddLocation={onAddLocation} onDrawArea={forNew ? undefined : onDrawArea} />}
        {/* Pinned while the list scrolls. A form, so the keyboard's Search key (and the button) put the keyboard away. */}
        <form role="search" className={s.chooserSearch} data-pinned="" onSubmit={(e) => { e.preventDefault(); search.current?.blur(); }}>
          <SearchField ref={search} className={s.chooserField} label="Search sites and parts" placeholder="Search sites and parts" value={query} onChange={setQuery} />
          <button type="submit" className={s.chooserSearchButton}>Search</button>
        </form>
        <div className={s.chooserList}>
          {/* One site open at a time, and only when tapped: typing filters the list but opens nothing. */}
          <Accordion.Root type="single" collapsible value={open} onValueChange={setOpen}>{rows()}</Accordion.Root>
          {shown.length === 0 && <p className={s.chooserEmpty}>No site or part matches “{q}”.</p>}
        </div>
      </div>
    </section>
  );
}
