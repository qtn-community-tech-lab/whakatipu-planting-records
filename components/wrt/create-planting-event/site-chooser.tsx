"use client";
/**
 * Choose where: a search and a sort (A–Z, most planted, most recent), then every site, with its areas
 * and when it was last planted. A site with several areas is an accordion (Radix, one open at a time,
 * animated) that opens to "Whole site" and its parts, ending with New sublocation (a pin dropped on the
 * map as a part of it); a site with one area or none is a single row. Create a new site is pinned at the bottom. With no site chosen it is the panel (All sites); otherwise it takes the panel's place while
 * it's open (the phone sheet goes full screen for it), so there is one sheet, never a dialog over it. Escape or Close closes it.
 * For a new pin or a drawn area (`forNew`) it asks which site that belongs to instead.
 */
import { ChevronDown, MapPin, MapPinPlus, Plus } from "lucide-react";
import { Accordion } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import type { PlantTotals } from "@/components/wrt/events/map-event-form";
import type { SiteOption } from "@/lib/wrt/events/form-options";
import { formatNumber, partBesideSite, rankMatches } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import f from "@/components/wrt/events/map-event-form.module.css";
import { ListRow } from "@/components/wrt/shared/list-row";
import { SearchField } from "@/components/wrt/shared/search-field";
import add from "./add-to-map.module.css";
import s from "./site-chooser.module.css";

type Sort = "az" | "most" | "recent";
const SORTS: [Sort, string][] = [["az", "A–Z"], ["most", "Most planted"], ["recent", "Recent"]];

export function SiteChooser({ sites, totals, value, onChoose, onClose, forNew, onKeepNew, onAddSublocation, onNewSite, onPreview, searchAsk = 0 }: {
  sites: readonly SiteOption[];
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"). */
  totals: PlantTotals;
  /** The current choice, marked in the list. */
  value: { slug: string; parcelId: string | null };
  onChoose: (slug: string, parcelId: string | null) => void;
  /** Left out when there's nothing to close back to (no site chosen yet): no heading or ×, the panel's title says it. */
  onClose?: (() => void) | undefined;
  /** A new pin, or an area drawn but not at any site yet: the chooser asks for its site. */
  forNew?: { what: "area" | "location"; atSite: boolean } | undefined;
  /** A new location: keep it as a new site of its own, at no site we know. */
  onKeepNew?: (() => void) | undefined;
  /** A new part of a site: drop a pin on the map as a sublocation of it. */
  onAddSublocation?: ((siteSlug: string) => void) | undefined;
  /** Create a new site: drop a pin on the map for a site we don't know yet. */
  onNewSite?: (() => void) | undefined;
  /** A site opened in the list ("" when closed again): the map shows it before anything is chosen. */
  onPreview?: ((siteSlug: string) => void) | undefined;
  /** Goes up each time the page's Search is tapped: the search box takes focus. */
  searchAsk?: number | undefined;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("az");
  const q = query.trim();
  // The open site: the chosen one to start with, then whichever is tapped. Typing doesn't change it.
  const [open, setOpen] = useState(value.slug);
  // Opened in the panel's place: the heading takes focus, so screen readers hear the question.
  useEffect(() => heading.current?.focus(), []);
  useEffect(() => { if (searchAsk) search.current?.focus(); }, [searchAsk]);

  // With a search: sites that match, or that have a part that matches (only those parts shown).
  // In the chosen sort (the sites come A–Z; ties stay so); browsing, the chosen site comes first:
  // switching part at it is the usual reason to be here.
  const plantsAt = (slug: string) => totals[slug]?.plants ?? 0;
  const by = { az: () => 0, most: (a: SiteOption, b: SiteOption) => plantsAt(b.slug) - plantsAt(a.slug), recent: (a: SiteOption, b: SiteOption) => (totals[b.slug]?.lastOrder ?? -1) - (totals[a.slug]?.lastOrder ?? -1) }[sort];
  const shown = sites.flatMap((site) => {
    const siteHit = !q || rankMatches([site], q).length > 0;
    const parts = q && !siteHit ? rankMatches(site.parts, q) : site.parts;
    return siteHit || parts.length ? [{ site, parts }] : [];
  }).sort((a, b) => by(a.site, b.site)).sort((a, b) => Number(b.site.slug === value.slug) - Number(a.site.slug === value.slug));

  // The plants on the right, at a site ("slug") or a part ("slug/part id"); a site's say what they are.
  const plants = (key: string) => formatNumber(totals[key]?.plants ?? 0);
  const sitePlants = (slug: string) => <span className={s.figure}>{plants(slug)}<small>plants</small></span>;
  // Under a site's name: its areas (when there's more than one) and its last season planted.
  const about = (site: SiteOption) => {
    const last = totals[site.slug]?.last;
    if (!last) return site.parts.length > 1 ? `${site.parts.length} areas · No plantings yet` : "No plantings yet";
    return site.parts.length > 1 ? `${site.parts.length} areas · last planted ${last}` : `Last planted ${last}`;
  };
  // Under the heading: what's chosen now, e.g. "Glenorchy, whole site".
  const chosen = sites.find((x) => x.slug === value.slug);
  const part = chosen?.parts.find((p) => p.id === value.parcelId);
  const now = chosen && `${chosen.name}, ${part ? partBesideSite(part.name, chosen.name) : "whole site"}`;

  const rows = () => shown.map(({ site, parts }) => {
    const chosenHere = value.slug === site.slug;
    // One area or none: the site is the only choice (its one area is the site as a whole).
    if (site.parts.length <= 1) {
      return (
        <ul key={site.slug} className={s.chooserRow}>
          <li>
            <ListRow
              className={s.choice} aria-pressed={chosenHere} onClick={() => onChoose(site.slug, null)}
              title={site.name} subtitle={about(site)} figure={sitePlants(site.slug)} end={chosenHere && <span className={s.choiceOn}>Chosen</span>}
            />
          </li>
        </ul>
      );
    }
    const chosenPart = chosenHere ? site.parts.find((p) => p.id === value.parcelId)?.name ?? "Whole site" : null;
    return (
      <Accordion.Item key={site.slug} value={site.slug} className={s.chooserItem}>
        <Accordion.Header className={s.chooserHeader}>
          <Accordion.Trigger asChild>
            <ListRow
              className={s.chooserTrigger} title={site.name} figure={sitePlants(site.slug)} data-chosen={chosenHere || undefined}
              // What's chosen, or which parts a search matched; otherwise its areas and last season.
              subtitle={
                chosenPart ? `Chosen: ${partBesideSite(chosenPart, site.name)}`
                : q && parts.length < site.parts.length ? `${parts.length} matching ${parts.length === 1 ? "part" : "parts"}`
                : about(site)
              }
              end={<ChevronDown size={16} strokeWidth={2.4} />}
            />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className={s.chooserContent}>
          <ul>
            {(!q || rankMatches([site], q).length > 0) && option("Whole site", site.slug, null, plants(site.slug))}
            {parts.map((p) => option(partBesideSite(p.name, site.name), site.slug, p.id, plants(`${site.slug}/${p.id}`)))}
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

  const option = (label: string, slug: string, parcelId: string | null, figure: string) => {
    const on = value.slug === slug && value.parcelId === parcelId;
    return (
      <li key={parcelId ?? "whole"}>
        <ListRow
          className={s.choice} aria-pressed={on} onClick={() => onChoose(slug, parcelId)}
          title={label} figure={figure} end={on && <span className={s.choiceOn}>Chosen</span>}
        />
      </li>
    );
  };

  return (
    <section className={f.form} aria-labelledby={onClose ? "site-chooser-title" : undefined} aria-label={onClose ? undefined : "All sites"} onKeyDown={(e) => { if (e.key === "Escape") onClose?.(); }}>
      <div className={f.scroll}>
        {onClose && (
          // The same pin header as the panel's other screens, with Close back to where you were (as the phone bar's Close).
          <header className={s.chooserHead} data-question={forNew ? "" : undefined}>
            <span className={s.chooserIcon} aria-hidden="true"><MapPin size={22} strokeWidth={2.2} /></span>
            <span>
              <h2 ref={heading} id="site-chooser-title" tabIndex={-1}>{forNew ? `Which site is this ${forNew.what === "area" ? "area" : "new location"} at?` : "Choose a site"}</h2>
              {!forNew && now && <p>Now: {now}</p>}
            </span>
            <button type="button" className={s.chooserBack} onClick={onClose}>Close</button>
          </header>
        )}
        {forNew?.what === "area" && <p className={s.chooserNote}>The area you drew isn&apos;t near a site we know. Choose its site.</p>}
        {forNew?.what === "location" && !forNew.atSite && <p className={s.chooserNote}>The pin you dropped isn&apos;t near a site we know. Choose the site it belongs to, or keep it as a new site.</p>}
        {forNew?.what === "location" && onKeepNew && (
          <button type="button" className={add.button} onClick={onKeepNew}>
            <MapPinPlus size={20} strokeWidth={2.2} aria-hidden="true" />{forNew.atSite ? "Make it a new site instead" : "Keep it as a new site"}
          </button>
        )}
        {/* Pinned while the list scrolls. A form, so the keyboard's Search key (and the button) put the keyboard away. */}
        <form role="search" className={s.chooserSearch} data-pinned="" onSubmit={(e) => { e.preventDefault(); search.current?.blur(); }}>
          <SearchField ref={search} className={s.chooserField} label="Search sites and parts" placeholder="Search sites and parts" value={query} onChange={setQuery} />
          <button type="submit" className={s.chooserSearchButton}>Search</button>
        </form>
        {/* Browsing order; a search ranks within it. */}
        <div role="radiogroup" aria-label="Sort sites" className={cn(f.segment, s.sort)}>
          {SORTS.map(([key, label]) => (
            <button key={key} type="button" role="radio" aria-checked={sort === key} className={f.segmentItem} onClick={() => setSort(key)}>{label}</button>
          ))}
        </div>
        <div className={s.chooserList}>
          {/* One site open at a time, and only when tapped: typing filters the list but opens nothing. */}
          <Accordion.Root type="single" collapsible value={open} onValueChange={(slug) => { setOpen(slug); onPreview?.(slug); }}>{rows()}</Accordion.Root>
          {shown.length === 0 && <p className={s.chooserEmpty}>No site or part matches “{q}”.</p>}
        </div>
      </div>
      {/* Pinned under the list, like the form's footer. Not while asking about a new pin or area: that has its own way. */}
      {onNewSite && !forNew && (
        <footer className={f.foot}>
          <button type="button" className={cn(f.back, s.newSite)} onClick={onNewSite}>
            <MapPinPlus size={18} strokeWidth={2.2} aria-hidden="true" />Create a new site
          </button>
        </footer>
      )}
    </section>
  );
}
