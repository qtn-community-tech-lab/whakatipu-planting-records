"use client";
/**
 * Choose where: a search and a sort, then every site with its places. A site with places is an accordion; one
 * without is a single row. With no site chosen it is the panel (All sites); otherwise it takes the panel's place
 * while open, so there is one sheet, never a dialog over it.
 */
import { ChevronDown, MapPin } from "lucide-react";
import { Accordion } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import type { PlantTotals } from "../map/sites";
import type { SiteOption } from "@/lib/wrt/events/form-options";
import { formatNumber, partBesideSite, rankMatches } from "@/lib/wrt/text";
import * as panel from "../panel-classes";
import { ListRow } from "@/components/wrt/shared/list-row";
import { SearchField } from "@/components/wrt/shared/search-field";
import { Segmented } from "@/components/wrt/shared/segmented";
import s from "./site-chooser.module.css";

type Sort = "az" | "most" | "recent";
const SORTS: [Sort, string][] = [["az", "A–Z"], ["most", "Most planted"], ["recent", "Recent"]];

export function SiteChooser({ sites, totals, value, onChoose, onClose, onPreview, searchAsk = 0 }: {
  sites: readonly SiteOption[];
  totals: PlantTotals;
  value: { slug: string; partId: string | null };
  onChoose: (slug: string, partId: string | null) => void;
  /** Left out when there's nothing to close back to (no site chosen yet): no heading or ×, the panel's title says it. */
  onClose?: (() => void) | undefined;
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
  const about = (site: SiteOption) => {
    const last = totals[site.slug]?.last;
    if (!last) return site.parts.length > 1 ? `${site.parts.length} places · No plantings yet` : "No plantings yet";
    return site.parts.length > 1 ? `${site.parts.length} places · last planted ${last}` : `Last planted ${last}`;
  };
  const chosen = sites.find((x) => x.slug === value.slug);
  const part = chosen?.parts.find((p) => p.id === value.partId);
  const now = chosen && `${chosen.name}, ${part ? partBesideSite(part.name, chosen.name) : "whole site"}`;

  const rows = () => shown.map(({ site, parts }) => {
    const chosenHere = value.slug === site.slug;
    // No places: the site is the only choice.
    if (!site.parts.length) {
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
    const chosenPart = chosenHere ? site.parts.find((p) => p.id === value.partId)?.name ?? "Whole site" : null;
    return (
      <Accordion.Item key={site.slug} value={site.slug} className={s.chooserItem}>
        <Accordion.Header className={s.chooserHeader}>
          <Accordion.Trigger asChild>
            <ListRow
              className={s.chooserTrigger} title={site.name} figure={sitePlants(site.slug)} data-chosen={chosenHere || undefined}
              // What's chosen, or which places a search matched; otherwise its places and last season.
              subtitle={
                chosenPart ? `Chosen: ${partBesideSite(chosenPart, site.name)}`
                : q && parts.length < site.parts.length ? `${parts.length} matching ${parts.length === 1 ? "place" : "places"}`
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
          </ul>
        </Accordion.Content>
      </Accordion.Item>
    );
  });

  const option = (label: string, slug: string, partId: string | null, figure: string) => {
    const on = value.slug === slug && value.partId === partId;
    return (
      <li key={partId ?? "whole"}>
        <ListRow
          className={s.choice} aria-pressed={on} onClick={() => onChoose(slug, partId)}
          title={label} figure={figure} end={on && <span className={s.choiceOn}>Chosen</span>}
        />
      </li>
    );
  };

  return (
    <section className={panel.form} aria-labelledby={onClose ? "site-chooser-title" : undefined} aria-label={onClose ? undefined : "All sites"} onKeyDown={(e) => { if (e.key === "Escape") onClose?.(); }}>
      <div className={panel.scroll}>
        {onClose && (
          // The same pin header as the panel's other screens, with Close back to where you were (as the phone bar's Close).
          <header className={s.chooserHead}>
            <span className={s.chooserIcon} aria-hidden="true"><MapPin size={22} strokeWidth={2.2} /></span>
            <span>
              <h2 ref={heading} id="site-chooser-title" tabIndex={-1}>Choose a site</h2>
              {now && <p>Now: {now}</p>}
            </span>
            <button type="button" className={s.chooserBack} onClick={onClose}>Close</button>
          </header>
        )}
        {/* Pinned while the list scrolls. A form, so the keyboard's Search key (and the button) put the keyboard away. */}
        <form role="search" className={s.chooserSearch} data-pinned="" onSubmit={(e) => { e.preventDefault(); search.current?.blur(); }}>
          <SearchField ref={search} className={s.chooserField} label="Search sites and places" placeholder="Search sites and places" value={query} onChange={setQuery} />
          <button type="submit" className={s.chooserSearchButton}>Search</button>
        </form>
        {/* Browsing order; a search ranks within it. */}
        <Segmented label="Sort sites" options={SORTS} value={sort} onChange={setSort} />
        <div className={s.chooserList}>
          {/* One site open at a time, and only when tapped: typing filters the list but opens nothing. */}
          <Accordion.Root type="single" collapsible value={open} onValueChange={(slug) => { setOpen(slug); onPreview?.(slug); }}>{rows()}</Accordion.Root>
          {shown.length === 0 && <p className={s.chooserEmpty}>No site or place matches “{q}”.</p>}
        </div>
      </div>
    </section>
  );
}
