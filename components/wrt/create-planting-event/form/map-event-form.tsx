"use client";
/**
 * The planting-event form for the map view: the same state and checks as EventForm
 * (useEventForm), on one scrolling page laid out for a panel over the map.
 *
 * Where and when first: the site on a mini map, then under it the site and part (tap to open the
 * site chooser) and the date with its season.
 * Then what was planted: a search, then one row per species (name, Māori name, how many here
 * before) with a quantity column down the side, like the paper sheets. Every other species is
 * listed underneath; the search filters both lists in place. An optional note, then Submit.
 */
import { Calendar, Camera, ChevronRight, MapPin, StickyNote } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { TextareaInput } from "@/components/ui/inputs";
import { Spinner } from "@/components/ui/spinner";
import { FigureList } from "@/components/wrt/shared/figure-list";
import { ListRow } from "@/components/wrt/shared/list-row";
import { SearchField } from "@/components/wrt/shared/search-field";
import { NUMBER_FIELD, digits, enterStaysInField } from "@/components/wrt/shared/fields";
import type { EventFormOptions, SpeciesOption } from "@/lib/wrt/events/form-options";
import { formatPlantedOn } from "@/lib/wrt/events/season";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";
import { describeEvent, WHOLE_SITE, type EventSummary } from "@/lib/wrt/events/summary";
import type { PlantingEventInput } from "@/lib/wrt/events/types";
import { NOTES_MAX } from "@/lib/wrt/events/validate";
import { DatePicker } from "@/components/ui/date-picker";
import { formatNumber, partBesideSite, rankMatches } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import { useEventForm, type EventFormState } from "./use-event-form";
import type { PlantingEventSubmitResult } from "@/db/types";
import { useHideOnScroll } from "./use-hide-on-scroll";
import s from "../panel.module.css";
import * as panel from "../panel-classes";

/** "Today, 12 Nov", or "3 Oct 2026": short enough for half a phone's width. */
const shortDate = (date: string, today: string) =>
  date === today ? `Today, ${formatPlantedOn(today).replace(/^\S+ | \d{4}$/g, "")}` : formatPlantedOn(date).replace(/^\S+ /, "");

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

/** "1,280 plants · 30 species", or "No plants recorded yet". */
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
  const entered = form.lines.some((l) => l.speciesId) || !!form.notes.trim();
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
    form.chooseSite(picked.slug);
    if (picked.partId) form.setParcelId(picked.partId);
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
  const placeErrors = Object.keys(form.errors).some((path) => !path.startsWith("species") && path !== "notes");

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
            {form.errors.form ?? "Some details need fixing. They are marked below."}
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

/** The date, and the season it falls in (always the date's). Tap anywhere on it to change the date. */
function When({ form, today }: { form: EventFormState; today: string }) {
  // The event's row is saved (its plants weren't): the date stays as saved.
  const { err } = form;
  return (
    <section className={panel.group} aria-label="When">
      {/* The whole tile opens the calendar. */}
      <DatePicker
        value={form.plantedOn} max={today} onChange={form.changeDate} className={s.pick} disabled={form.partlySaved}
        aria-label={`${form.plantedOn ? formatPlantedOn(form.plantedOn) : "No date"}, ${form.season} ${form.seasonYear}: change the planting date`} aria-invalid={!!err("plantedOn")}
      >
        <Calendar size={18} strokeWidth={2} aria-hidden="true" />
        <span>
          {/* Short, to fit half a phone's width (the label above has it in full). */}
          <b>{form.plantedOn ? shortDate(form.plantedOn, today) : "Choose a date"}</b>
          <small>{form.season} {form.seasonYear}</small>
        </span>
      </DatePicker>
      {err("plantedOn") && <p className={s.problem} role="alert">{err("plantedOn")}</p>}
      {err("season") && <p className={s.problem} role="alert">{err("season")}</p>}
    </section>
  );
}

/**
 * The event's note: one button beside Submit, with a dot once there's a note. It opens a box near
 * the top of the screen, clear of a phone's keyboard. The note is kept as it's typed.
 */
function NoteButton({ form }: { form: EventFormState }) {
  const [open, setOpen] = useState(false);
  if (form.partlySaved && !form.notes) return null; // saved with the event: nothing to add now
  const problem = form.err("notes");
  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger asChild>
        <button type="button" className={cn(panel.back, "relative grid w-[52px] place-items-center p-0")} data-problem={problem ? "" : undefined} aria-label={form.notes ? "Note (added)" : "Add a note"}>
          <StickyNote size={18} strokeWidth={2.2} aria-hidden="true" />
          {(form.notes || problem) && <span className={cn("absolute top-3 right-3 size-[9px] rounded-full bg-[var(--cn-green-800)] shadow-[0_0_0_2px_var(--surface-soft)]", problem && "bg-[var(--text-risk)]")} aria-hidden="true" />}
        </button>
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[var(--cn-scrim)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <D.Content className="fixed left-1/2 top-[max(16px,8vh)] z-50 flex w-[min(440px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-3 rounded-[22px] bg-white p-5 text-[var(--text-strong)] shadow-[0_24px_60px_rgba(21,38,28,0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <D.Title className="m-0 text-[18px] font-extrabold leading-tight">Note for this planting</D.Title>
          <D.Description className="sr-only">Who planted, conditions, anything WRT should know.</D.Description>
          <TextareaInput
            label="Note" optional rows={5} autoComplete="off" maxLength={NOTES_MAX} value={form.notes} error={problem} autoFocus
            placeholder="Who planted, conditions, anything WRT should know"
            onChange={(e) => form.setNotes(e.target.value)} disabled={form.partlySaved}
          />
          <div className="flex justify-end">
            <D.Close className="cn-btn cn-btn--primary">Done</D.Close>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/**
 * Where and when, confirmed up front. The site on a mini map first, then under it the site and
 * part (tap to open the chooser) and the date with its season. Past plantings are on the site's page.
 */
function WhereWhen({ form, today, plantedArea, onChooseSite, placeMenu }: MapEventFormProps & { form: EventFormState }) {
  const { err } = form;
  const siteProblem = err("siteSlug") ?? err("partId");
  const partName = form.site?.parts.find((p) => p.id === form.partId)?.name;

  return (
    <>
      {/* The map first: where it is; then the place and the date under it (with a site, in one card). */}
      {!form.site && plantedArea}
      {!form.site && (
        <section className={panel.group} aria-label="Site">
          <button type="button" className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-tile)] border-0 bg-[var(--surface-risk)] py-2 pr-3 pl-4 text-left font-sans text-[14px] leading-[1.35] font-semibold text-[var(--text-risk)]" onClick={onChooseSite} data-problem={siteProblem ? "" : undefined}>
            {siteProblem ?? "Choose a site, or tap its pin on the map"}
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </section>
      )}
      {form.site ? (
        // One card: the map on top, then where and when side by side, each a tile you tap to change:
        // the site and part (the site chooser), then the date.
        <div className={s.whereCard}>
          {plantedArea}
          <div className={s.picks}>
            {(() => {
              const label = `${form.site.name}, ${partName ? partBesideSite(partName, form.site.name) : "whole site"}: change the part or site`;
              const children = (
                <>
                  <MapPin size={18} strokeWidth={2} aria-hidden="true" />
                  <span><b>{form.site.name}</b><small>{partName ? partBesideSite(partName, form.site.name) : "Whole site"}</small></span>
                </>
              );
              return placeMenu && !form.partlySaved
                ? placeMenu({ className: s.pick!, label, children })
                : <button type="button" className={s.pick} onClick={onChooseSite} disabled={!onChooseSite || form.partlySaved} aria-label={label}>{children}</button>;
            })()}
            <When form={form} today={today} />
          </div>
        </div>
      ) : <When form={form} today={today} />}
      {form.site && err("partId") && (
        // Parts are switched in the panel's header.
        <section className={panel.group} aria-label="Where it was planted">
          <p className={s.problem} role="alert">{err("partId")}</p>
        </section>
      )}
    </>
  );
}

function WhatPlanted({ form, options, suggestions, onFocus }: {
  form: EventFormState; options: EventFormOptions; suggestions: SpeciesSuggestion[];
  onFocus?: (() => void) | undefined;
}) {
  // The camera is a placeholder for now: tapping it only says photos come later.
  const [cameraTip, setCameraTip] = useState(false);
  useEffect(() => {
    if (!cameraTip) return;
    const t = setTimeout(() => setCameraTip(false), 2500);
    return () => clearTimeout(t);
  }, [cameraTip]);
  const { err } = form;
  const [query, setQuery] = useState("");
  // Problems shown (Submit): a quantity's problem on a line out of view (another search) brings it into view, so it can take focus.
  const [shownAsk, setShownAsk] = useState(form.problemAsk);
  if (form.problemAsk !== shownAsk) {
    setShownAsk(form.problemAsk);
    const bad = Object.keys(form.errors).map((path) => /^species\.(\d+)\./.exec(path)?.[1]).find((i) => i !== undefined);
    if (bad !== undefined && form.lines[Number(bad)]) setQuery("");
  }
  const byId = new Map(options.species.map((x) => [x.id, x]));
  const site = new Map(suggestions.map((x) => [x.speciesId, x]));
  const lineOf = (id: string) => form.lines.findIndex((l) => l.speciesId === id);

  // Species added from the list underneath stay there until the search changes, so the box
  // being typed in isn't moved (and rebuilt) mid-number.
  const [kept, setKept] = useState<{ query: string; ids: ReadonlySet<string> }>({ query: "", ids: new Set() });
  const keptIds = kept.query === query ? kept.ids : new Set<string>();

  // The site's species, then anything added from the list underneath. Underneath: every other
  // species, or with a search, the best matches from them. Typing filters both in place.
  const listed = [
    ...suggestions.map((x) => byId.get(x.speciesId)).filter((x): x is SpeciesOption => !!x),
    ...form.lines.map((l) => byId.get(l.speciesId)).filter((x): x is SpeciesOption => !!x && !site.has(x.id) && !keptIds.has(x.id)),
  ];
  const shown = query.trim() ? rankMatches(listed, query) : listed;
  const listedIds = new Set(listed.map((x) => x.id));
  const more = query.trim()
    ? rankMatches(options.species, query).filter((x) => !listedIds.has(x.id)).slice(0, 15)
    : options.species.filter((x) => !listedIds.has(x.id));

  /** Typing a number adds the species; clearing it takes the species off again. */
  const setPlanted = (speciesId: string, value: string) => {
    const i = lineOf(speciesId);
    if (i < 0) {
      if (!value.trim()) return;
      if (!listedIds.has(speciesId)) setKept({ query, ids: new Set([...keptIds, speciesId]) });
      form.addSpecies(speciesId, value);
      return;
    }
    const l = form.lines[i]!; // i >= 0: found above
    if (value.trim()) form.updateLine(l.key, { quantity: value });
    else if (form.lines.length > 1) form.removeLine(l.key);
    else form.updateLine(l.key, { speciesId: "", quantity: "" });
  };

  // Submit was pressed with nothing entered: say so at the list, and mark the first box so focus lands there.
  const nothingYet = !form.lines.some((l) => l.speciesId) && Object.keys(form.errors).length > 0;

  const row = (sp: SpeciesOption, first: boolean) => {
    const sg = site.get(sp.id);
    const i = lineOf(sp.id);
    const qtyError = i >= 0 ? err(`species.${i}.quantity`) : undefined;
    const name = sg ? sg.common ?? sg.scientific : sp.name;
    const italic = sg ? !sg.common : sp.isScientific;
    // Māori name under the common one; the scientific name when they're the same or there isn't one.
    const second = sg
      ? (sg.maori && sg.maori !== name ? sg.maori : sg.common ? <i>{sg.scientific}</i> : null)
      : (!sp.isScientific ? <i>{sp.scientific}</i> : null);
    return (
      <li key={sp.id} className={s.row} data-picked={i >= 0 || undefined} data-invalid={qtyError || (first && nothingYet) ? true : undefined}>
        <ListRow
          size="md" photo={sg?.photo ?? null} initial={name.charAt(0)} tintKey={sp.id}
          title={italic ? <i>{name}</i> : name} subtitle={second}
          // How many went in here before: context, so quiet and unlabelled; hovering (or a screen reader) says what it is.
          figure={sg ? <span title={`${formatNumber(sg.here)} planted here before`}><span aria-hidden="true">{formatNumber(sg.here)}</span><span className="sr-only">{formatNumber(sg.here)} planted here before</span></span> : ""}
          end={
            <input
              className={s.rowQty} aria-label={`${name}: how many planted`}
              aria-invalid={qtyError || (first && nothingYet) ? true : undefined}
              {...NUMBER_FIELD} maxLength={6} enterKeyHint="next" data-enter-next="" placeholder="+"
              value={form.lines[i]?.quantity ?? ""}
              onChange={(e) => setPlanted(sp.id, digits(e.target.value))}
            />
          }
        />
        {qtyError && <span className={panel.rowError}>{qtyError}</span>}
      </li>
    );
  };

  return (
    <section className={panel.group} aria-labelledby="what-planted" onFocus={onFocus}>
      {/* What was planted, and the running count. */}
      <div className="relative z-[2] flex items-end justify-between gap-3 [html[data-keyboard]_&]:items-center">
        <h3 id="what-planted" className="m-0 font-sans text-[19px] leading-[1.2] font-bold text-[var(--text-strong)]">What did you plant?</h3>
        <span className="shrink-0 whitespace-nowrap font-sans text-[13px] leading-[1.3] font-medium text-[var(--text-muted)] [&_b]:font-sans [&_b]:text-[15px] [&_b]:leading-[normal] [&_b]:font-bold [&_b]:tabular-nums [&_b]:text-[var(--text-strong)]" aria-live="polite">
          <b>{formatNumber(form.total)}</b> plants · {form.lines.filter((l) => l.speciesId).length} species
        </span>
      </div>
      <div className="sticky top-0 z-[1] flex flex-col gap-2 bg-[var(--surface-app)] px-0 pt-0 pb-2 shadow-[0_-18px_0_var(--surface-app)]" data-pinned="">
        <SearchField label="Search species" placeholder="Search species" value={query} onChange={setQuery}>
          <button
            type="button" className="grid size-10 cursor-pointer place-items-center rounded-[var(--radius-row)] border-0 bg-[var(--surface-soft)] text-[var(--cn-green-800)] aria-disabled:cursor-help aria-disabled:opacity-55" aria-disabled="true" title="Photos are coming next"
            aria-label="Take a photo of what was planted (coming next)" onClick={() => setCameraTip(true)}
          >
            <Camera size={20} strokeWidth={2} />
          </button>
        </SearchField>
        {cameraTip && <p className="m-0 self-end rounded-[var(--radius-row)] bg-[var(--cn-green-900)] px-3 py-2 font-sans text-[13px] leading-[1.3] font-semibold text-[var(--text-on-dark)]" role="status">Photos of what was planted are coming next.</p>}
        {nothingYet && <p className={s.problem} role="alert">Enter how many went in for at least one species.</p>}
        {err("species") && <p className={s.problem} role="alert">{err("species")}</p>}
      </div>

      {/* The site's own species first (the order says they were planted here before), then the rest under a quiet divider. */}
      {shown.length > 0 && <ul className={panel.rows}>{shown.map((sp, n) => row(sp, n === 0))}</ul>}
      {more.length > 0 && (
        <>
          {shown.length > 0 && <p className="mx-0 mt-1.5 -mb-1 font-sans text-[14px] leading-[1.3] font-semibold text-[var(--text-muted)]">{query.trim() ? "Other species" : "All species"}</p>}
          <ul className={panel.rows}>{more.map((sp, n) => row(sp, shown.length === 0 && n === 0))}</ul>
        </>
      )}
      {query.trim() && shown.length === 0 && more.length === 0 && (
        <p className={panel.empty}>No species matches “{query.trim()}”.</p>
      )}
    </section>
  );
}

/** The place planted (its pin), and what went in there. */
interface PlaceCard { key: string; title: string; total: number }
const plantsLabel = (n: number) => `${formatNumber(n)} ${n === 1 ? "plant" : "plants"}`;
const cardLead = <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-row)] bg-[var(--surface-soft)] text-[var(--cn-green-800)]"><MapPin size={20} strokeWidth={2.2} /></span>;


/** What Submit shows: a short receipt, marked "Saved", or plainly "Not saved" when the form can't save. */
function Receipt({ hidden, summary, cards, saved, onBack, onStartAnother, onFinish }: {
  hidden?: boolean | undefined;
  summary: EventSummary; cards: PlaceCard[];
  /** The event and its plants were saved: no going back to the form (it would save them again). */
  saved: boolean;
  onBack: () => void; onStartAnother: () => void;
  /** Saved: out of the form, e.g. to the site's page, where the new planting shows. */
  onFinish?: { label: string; onClick: () => void } | undefined;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const where = summary.part === WHOLE_SITE ? summary.site : `${summary.site} · ${partBesideSite(summary.part, summary.site)}`;
  return (
    <div className={cn(panel.form, s.slideIn)} hidden={hidden}>
      <header className={panel.head}>
        <Badge tone={saved ? "ok" : "review"} className="self-start">{saved ? "Saved" : "Not saved"}</Badge>
        <h2 ref={headingRef} tabIndex={-1} className={panel.title}>1 planting event</h2>
        <p className={panel.context} role="status">
          <span>{saved ? "The planting event and its plants are saved." : "Everything checks out. This prototype can’t store events yet."}</span>
        </p>
      </header>
      <div className={panel.scroll}>
        <p className="m-0 font-sans text-[15px] leading-[1.4] font-normal text-[var(--text-strong)] [&_b]:font-extrabold [&_span]:mt-0.5 [&_span]:block [&_span]:text-[13.5px] [&_span]:text-[var(--text-muted)]">
          <b>{plantsLabel(summary.total)}</b> at {where}
          <span>{summary.date} · {summary.season}</span>
        </p>
        <FigureList title="Where" rows={cards.map((c) => ({ key: c.key, name: c.title, lead: cardLead, figure: plantsLabel(c.total) }))} />
      </div>
      <footer className={panel.foot}>
        {!saved && <button type="button" className={panel.back} onClick={onBack}>Back to the form</button>}
        {saved && onFinish && <button type="button" className={panel.back} onClick={onFinish.onClick}>{onFinish.label}</button>}
        <button type="button" className={panel.next} onClick={onStartAnother}>Start another</button>
      </footer>
    </div>
  );
}


