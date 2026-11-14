"use client";
/**
 * The planting-event form for the map view (state and checks in useEventForm), on one scrolling page laid out
 * for a panel over the map: where and when first (where-when.tsx), then what was planted (what-planted.tsx),
 * an optional note (note-button.tsx), then Submit, which shows the receipt (receipt.tsx).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { enterStaysInField } from "@/components/wrt/shared/fields";
import type { PlantingEventSubmitResult } from "@/db/types";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { describeEvent } from "@/lib/wrt/events/summary";
import type { PlantingEventInput } from "@/lib/wrt/events/types";
import { partBesideSite } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import { NoteButton } from "./note-button";
import { Receipt, type PlaceCard } from "./receipt";
import { useEventForm } from "./use-event-form";
import { useHideOnScroll } from "./use-hide-on-scroll";
import { WhatPlanted } from "./what-planted";
import { WhereWhen } from "./where-when";
import s from "../panel.module.css";
import * as panel from "../panel-classes";

export interface MapEventFormProps {
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
  /** Site to start on ("" for none yet). */
  initialSite: string;
  /** The part of that site to start on (its id), e.g. from a bookmark. */
  initialPart?: string | null | undefined;
  /** A picture of where it is (the host's mini map): at the top, and on the receipt. */
  plantedArea?: ReactNode | undefined;
  /** Back: out of the form, to what came before it (the site's overview). Entries are kept. */
  onBack?: (() => void) | undefined;
  /** The chosen site's most planted species, for the plant list. */
  suggestions: SpeciesSuggestion[];
  /** Something in the plant list has focus (its search, a quantity): phones take the sheet full screen for it. */
  onListFocus?: (() => void) | undefined;
  /** Open the host's site chooser (no site yet, or a site problem to fix). */
  onChooseSite?: (() => void) | undefined;
  /** The place tile's menu (the site's parts, Another site), wrapping the tile button. Without it the tile opens the site chooser. */
  placeMenu?: ((button: { className: string; label: string; children: ReactNode }) => ReactNode) | undefined;
  /** A site (and part) picked outside the form, from a pin on the map: the form switches to it. */
  picked?: { slug: string; partId: string | null } | null;
  /** Tells the host when the site or part changes, so the map can move its pin. */
  onSiteChange?: ((siteSlug: string, partId: string | null) => void) | undefined;
  /** After a save, the receipt's way out beside Start another: e.g. back to the site's page. */
  onFinish?: { label: string; onClick: () => void } | undefined;
  /** Start another was pressed: the form starts over, and the host can follow (phones bring the sheet back up). */
  onReset?: (() => void) | undefined;
  /** Tells the host what the form holds: anything entered (a species, a note), saved, saved without its plants
   * (`partly`: where and when can't change now), or saving now. Unsaved entries make leaving ask. */
  onEntries?: ((state: FormEntries) => void) | undefined;
  /** Kept mounted but out of sight, e.g. while the host shows the site first. */
  hidden?: boolean | undefined;
  /** Saves the checked event and its plants (a server action). Without it, Submit shows a "Not saved" receipt. */
  onSave?: ((input: PlantingEventInput, savedPlantingEvent?: number) => Promise<PlantingEventSubmitResult>) | undefined;
}

export interface FormEntries { entered: boolean; saved: boolean; partly: boolean; saving: boolean }

export function MapEventForm(props: MapEventFormProps) {
  const [round, setRound] = useState(0);
  // The last pick from outside taken up, kept across Start another: a fresh round mustn't take up an old pick again.
  const applied = useRef<MapEventFormProps["picked"]>(null);
  /** True the first time a pick is seen (it's then taken up), false after. */
  const takePick = useCallback((p: MapEventFormProps["picked"]) => {
    if (!p || p === applied.current) return false;
    applied.current = p;
    return true;
  }, []);
  return <Form key={round} {...props} takePick={takePick} onStartAnother={() => { setRound((r) => r + 1); props.onReset?.(); }} />;
}

function Form(props: MapEventFormProps & { onStartAnother: () => void; takePick: (p: MapEventFormProps["picked"]) => boolean }) {
  const { options, today, initialSite, suggestions, picked, onSiteChange, hidden, onStartAnother } = props;
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const form = useEventForm({ options, today, formRef, headingRef, initialSite, initialPart: props.initialPart, save: props.onSave });
  // Phones: the footer gets out of the way while the page scrolls down the plant list.
  const scrollRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLElement>(null);
  useHideOnScroll(scrollRef, footRef, true);

  // Page changes slide in a little from the side they come from: forward from the right (the form shown again, a
  // receipt), back from the left (the form after its receipt). Plays once, then the class is taken off again.
  const [slide, setSlide] = useState<"forward" | "back" | null>(null);
  const [wasHidden, setWasHidden] = useState(!!hidden);
  const [wasOnReceipt, setWasOnReceipt] = useState(false);
  const onReceipt = form.preview !== null;
  if (!!hidden !== wasHidden) {
    setWasHidden(!!hidden);
    if (!hidden) setSlide("forward");
  }
  if (onReceipt !== wasOnReceipt) {
    setWasOnReceipt(onReceipt);
    if (!onReceipt) setSlide("back");
  }

  // What was planted: one card for the site (and part).
  const partName = form.site?.parts.find((p) => p.id === form.partId)?.name;
  const place = form.site ? (partName ? partBesideSite(partName, form.site.name) : form.site.name) : "";
  const cardsFor = (input: PlantingEventInput): PlaceCard[] => [{
    key: "all", title: form.site && partName ? `${form.site.name} · ${partBesideSite(partName, form.site.name)}` : place,
    total: input.species.reduce((t, l) => t + l.quantity, 0),
  }];

  const { onEntries } = props;
  const entered = form.lines.length > 0 || !!form.notes.trim();
  useEffect(() => {
    onEntries?.({ entered, saved: form.saved, partly: form.partlySaved, saving: form.saving });
  }, [entered, form.saved, form.partlySaved, form.saving, onEntries]);
  // Always, even with no site: the host shows the site in the header and title, so it must never keep an old one.
  useEffect(() => { onSiteChange?.(form.siteSlug, form.partId); }, [form.siteSlug, form.partId, onSiteChange]);
  // Take up each new pick once, so choosing another site in the form afterwards isn't undone.
  // A new key from the host starts empty, so the fresh form takes up the latest pick; Start another doesn't (see MapEventForm).
  const { takePick } = props;
  useEffect(() => {
    if (!picked || !takePick(picked)) return;
    if (form.partlySaved) return; // the event's row is saved at its place
    form.chooseSite(picked.slug, picked.partId);
  });
  // Opened again (it stays mounted while hidden): from the top, not where it was left.
  useEffect(() => {
    if (!hidden) scrollRef.current?.scrollTo(0, 0);
  }, [hidden]);

  if (form.preview) {
    return (
      <Receipt
        hidden={hidden} summary={describeEvent(form.preview, options)} cards={cardsFor(form.preview)} saved={form.saved}
        onBack={form.closePreview} onStartAnother={onStartAnother} onFinish={props.onFinish}
      />
    );
  }

  // The plant list says what's wrong with it there; anything else is said at the top.
  const placeErrors = Object.keys(form.errors).some((path) => path !== "species" && path !== "notes");

  return (
    <form
      ref={formRef} className={cn(panel.form, slide === "forward" && s.slideIn, slide === "back" && s.slideBack)}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget) setSlide(null); }} onSubmit={form.submit} onKeyDown={enterStaysInField} noValidate aria-label="New planting event" hidden={hidden}>
      {/* The panel's header already names the site; the tiles below say where and when. On phones the
          top bar says "New planting event" too, so the heading is for screen readers there. */}
      <header className={panel.head} data-repeat="">
        <h2 ref={headingRef} tabIndex={-1} className={panel.title}>New planting event</h2>
      </header>

      <div ref={scrollRef} className={panel.scroll}>
        {placeErrors && (
          <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
            Some details need fixing. They are marked below.
          </div>
        )}
        <WhereWhen {...props} form={form} />
        <WhatPlanted form={form} options={options} suggestions={suggestions} onFocus={props.onListFocus} />
      </div>

      {form.saveError && <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">{form.saveError}</div>}
      <footer ref={footRef} className={panel.foot}>
        {props.onBack && <button type="button" className={panel.back} onClick={props.onBack}>Back</button>}
        <NoteButton form={form} />
        <button type="submit" className={panel.next} disabled={form.saving} aria-busy={form.saving}>
          {form.saving ? <><Spinner aria-hidden="true" />Saving…</> : "Submit planting event"}
        </button>
      </footer>
      {!props.onSave && <p className="m-0 px-0 pt-0 pb-2 text-center font-sans text-[12.5px] leading-[1.4] font-normal text-[var(--text-muted)] max-md:[[data-away]+&]:hidden [html[data-keyboard]_&]:hidden">Prototype: Submit checks everything, but nothing is saved yet.</p>}
    </form>
  );
}
