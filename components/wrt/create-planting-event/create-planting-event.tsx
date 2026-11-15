"use client";
/**
 * The planting event page: a full-screen satellite map with a pin for every site, and a panel over it that
 * lists the sites and shows the chosen one. This file only wires together the parts in the files beside it.
 */
import type { Route } from "next";
import { useCallback, useReducer, useRef, useState } from "react";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { partBesideSite } from "@/lib/wrt/text";
import { FormPanel, type Snap } from "@/components/wrt/shared/form-panel";
import { MiniMap } from "@/components/wrt/shared/mini-map";
import { pinFor, sitePins, type LngLat, type PlantTotals, type SitePin } from "./map/sites";
import { PartMenu } from "./site/part-menu";
import { SiteOverview } from "./site/site-overview";
import { PinTooltip } from "./map/pin-tooltip";
import { SiteChooser } from "./site/site-chooser";
import { TopBar } from "./site/top-bar";
import { highlightSite, useCamera, useFindMe, usePlantingMap } from "./map/use-planting-map";
import { useKeyboardFit } from "./browser/use-keyboard-fit";
import { useMedia } from "./browser/use-media";
import { useAddressSync } from "./browser/use-address-sync";
import { initialPage, pageReducer, topOf } from "./planting-page";
import { Crumbs } from "./navigator";
import s from "./create-planting-event.module.css";

const WIDE = "(min-width: 768px)";
/** A tap on the map at least this far (px) from the chosen site's pin leaves the site. */
const AWAY_PX = 120;

export interface CreatePlantingEventProps {
  /** Site slug to start at, or "" to start with every site in view. */
  initialSite: string;
  /** A part of the initial site (its WRT number), or none for the whole site. */
  initialPart?: string | undefined;
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD". */
  today: string;
  exitHref: Route;
  /** Plants and species recorded at each site ("slug") and part ("slug/part id"), for the site chooser. */
  totals: PlantTotals;
  areas: Parameters<typeof sitePins>[1];
}

export function CreatePlantingEvent({ initialSite: siteFromAddress, initialPart, options, today, exitHref, totals, areas }: CreatePlantingEventProps) {
  // Where the page opened. Only the first value counts: a new start site would rebuild the map. (The part only seeds state.)
  const [initialSite] = useState(siteFromAddress);
  const wide = useMedia(WIDE);
  const mapEl = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  useKeyboardFit(screen);
  const [page, dispatch] = useReducer(pageReducer, initialPage);
  const { snap, searchAsk } = page;
  const setSnap = (to: Snap) => dispatch({ type: "snap", to });
  const top = topOf(page);
  const choosing = top?.kind === "list";
  const sites = options.sites;
  const [pins] = useState(() => sitePins(sites, areas, totals));
  // Where a site's (or part's) pin is.
  const pinAt = useCallback((slug: string, partId: string | null) => pinFor(pins, slug, partId), [pins]);
  const [siteSlug, setSiteSlug] = useState(initialSite);
  const [part, setPart] = useState<string | null>(initialPart ?? null);
  // What the camera centres: the chosen site's (part's) pin.
  const [focus, setFocus] = useState<LngLat | null>(() => pinAt(initialSite, initialPart ?? null));
  const site = sites.find((x) => x.slug === siteSlug);
  const siteName = site?.name ?? "Choose a site";
  const partName = site ? site.parts.find((p) => p.id === part)?.name ?? "Whole site" : undefined;
  // Beside the site's name, the part without the site in front of it: "Morning Star Reserve", not "Arthurs Point - Morning Star Reserve".
  const partShort = partName && site ? partBesideSite(partName, site.name) : partName;
  const changeSite = () => dispatch({ type: "openList", wide });
  const closeChooser = (back = false) => dispatch({ type: "closeList", wide, back });
  const searchSites = () => dispatch({ type: "search", wide, allSites });
  // The header pill and the phone title toggle it; everything else that asks for a site only ever opens it.
  const toggleChooser = () => (choosing ? closeChooser(true) : changeSite());
  function chooseSite(slug: string, partId: string | null) {
    goToPlace(slug, partId);
    dispatch({ type: "showChoice", wide });
  }

  const map = usePlantingMap({ pins, initialSite, container: mapEl, pinClass: s.pin ?? "", wideQuery: WIDE, onPick: pickPin, onTap: tapMap });
  const { findMe, said } = useFindMe(map);

  // The chosen site and part: the map lights the site's pins and goes to the part's (or the site's).
  function goToPlace(slug: string, partId: string | null) {
    setSiteSlug(slug);
    setPart(partId);
    highlightSite(map, slug);
    setFocus(pinAt(slug, partId));
  }

  function pickPin(pin: SitePin) {
    // The pin already chosen: as choosing its part again (the map goes there).
    if (pin.slug === siteSlug && pin.partId === part) {
      choosePart(pin.partId);
      if (!wide) setSnap("mid");
      return;
    }
    dispatch({ type: "endModes", snap: "mid" });
    goToPlace(pin.slug, pin.partId);
  }

  // Looking at a site, a tap on the map away from its pin goes back to every site.
  function tapMap(at: { x: number; y: number }) {
    if (!siteSlug || !map.current) return;
    const pin = pinAt(siteSlug, part);
    const p = pin && map.current.project(pin);
    if (p && Math.hypot(p.x - at.x, p.y - at.y) < AWAY_PX) return;
    goToPlace("", null);
  }

  useAddressSync({ siteSlug, part });
  // Back to every site.
  function leaveSite() {
    dispatch({ type: "leave" });
    goToPlace("", null);
  }
  // Off the map (Back from every site): the sites list takes this page's place, so back from there goes to the page before.
  const exit = () => window.location.replace(exitHref);
  // The panel's Back: one step up (the site list, a part, the site), and off the map only from every site.
  function goBack() {
    if (choosing) return closeChooser(true);
    if (site && part) return showSite();
    if (!allSites) return leaveSite();
    exit();
  }
  const hint = part && partShort ? partShort : undefined;
  // What the header, the title and the mini map call this site.
  const where = { title: siteName, sub: partShort };
  // The chosen site's overview, or with none, the site chooser (All sites).
  const allSites = !siteSlug;
  const siteHeader = !!siteSlug && !choosing;
  // What the panel shows, and how deep it sits, for its slide: the site list (the level of every site) 0, a site's page 1.
  const panelScreen = choosing || allSites ? "list" : `site:${siteSlug}:${part ?? ""}`;
  const panelDepth = panelScreen === "list" ? 0 : 1;
  const showMap = () => setSnap("peek");
  const parts = site ? site.parts.map((p) => ({ id: p.id, name: partBesideSite(p.name, site.name) })) : [];
  // The map goes to the part's pin, even when it's the part already chosen:
  // a new array each time, so the camera moves again.
  function choosePart(id: string | null) {
    dispatch({ type: "closeOver" });
    goToPlace(siteSlug, id);
    const at = pinAt(siteSlug, id);
    if (at) setFocus([at[0], at[1]]);
  }
  // All sites: a site opened in the list flies the map there and lights its pin (nothing chosen yet);
  // closed again, the map goes back out to every site. Choosing one of its rows opens its page.
  function previewSite(slug: string) {
    highlightSite(map, slug);
    const at = slug ? pinAt(slug, null) : null;
    setFocus(at ? [at[0], at[1]] : null);
  }
  function showSite() {
    dispatch({ type: "showSite", wide });
    choosePart(null);
  }

  useCamera(map, wide, snap, focus, pins);

  // A mini map at the top of the site's page: always on desktop (a slim strip), and on phones when the
  // sheet is full screen. A chosen site is named by the page's own header, so the map leaves its label off.
  const miniMap = focus && (wide || snap === "full")
    ? <MiniMap at={focus} label={where.title} sub={where.sub} onOpen={wide ? undefined : showMap} noCaption={!!site} compact={wide} />
    : undefined;

  return (
    <div ref={setScreen} className={s.screen} data-full-screen="">
      <div ref={mapEl} className={s.map} />
      <PinTooltip map={mapEl} />
      {/* Phones: a see-through green band behind the header; Safari tints its top bar from it. */}
      <div className={s.topBand} aria-hidden="true" />
      <TopBar siteName={site ? where.title : undefined} hint={hint} choosing={choosing} onChooseSite={toggleChooser} onFindMe={findMe} />
      {/* Phones' Find me (the + menu): a short word when it can't. */}
      {said && <p className={s.hint} role="status">{said}</p>}
      <FormPanel
        wide={wide} open container={screen} snap={snap} onSnap={setSnap} label="Planting map"
        title={where.title}
        subtitle={where.sub}
        screen={panelScreen} depth={panelDepth}
        onTitle={wide ? undefined : toggleChooser} titleOpen={choosing} titleIcon={allSites || siteHeader}
        titleMenu={!wide && site && !choosing ? (b) => (
          <PartMenu
            siteName={site.name} parts={parts} part={part} onChoosePart={choosePart} side="bottom"
            onAllSites={leaveSite} className={b.className} label={b.label}
          >
            {b.children}
          </PartMenu>
        ) : undefined}
        onSearch={wide ? undefined : searchSites}
        // Not on wide at every site (nothing in the page above it).
        onBack={wide && allSites && !choosing ? undefined : goBack}
        backLabel={allSites && !choosing ? "Leave the map" : "Back"}
        // Wide: the breadcrumb names the site and part. With no site, and on a site's overview, the title heads
        // the panel as on phones.
        titleHidden={!!site && !allSites && !siteHeader}
        above={
          <Crumbs
            siteName={site?.name} parts={parts} part={part} partName={part ? partShort : undefined}
            onAllSites={leaveSite} onSite={showSite} onChoosePart={choosePart} onOtherSite={changeSite}
          />
        }
      >
        {(choosing || allSites) && (
          <SiteChooser
            // With no site there's nothing behind it to close back to.
            sites={sites} totals={totals} value={{ slug: siteSlug, partId: part }} onChoose={chooseSite} onClose={allSites ? undefined : () => closeChooser(true)}
            searchAsk={searchAsk}
            onPreview={allSites ? previewSite : undefined}
          />
        )}
        {siteSlug && !choosing && (
          <SiteOverview
            slug={siteSlug} partId={part} partName={part ? partName : undefined} today={today} totals={totals} map={miniMap}
            places={part ? undefined : parts} onPlace={choosePart}
          />
        )}
      </FormPanel>
    </div>
  );
}
