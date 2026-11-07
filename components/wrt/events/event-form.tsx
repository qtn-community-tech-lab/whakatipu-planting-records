"use client";
/**
 * The planting-event form, for both "New planting event" and "Edit".
 *
 * Fields: site → optional part of site → map (draw one area) → planting date →
 * season and year (suggested from the date, editable) → species lines with
 * quantities → photo (disabled until storage exists) → notes.
 *
 * Markup only: state, validation and submit are in useEventForm. Every field
 * uses the shared inputs in components/ui/inputs for its label, hint and error.
 */
import { useId, useRef } from "react";
import { FormField, SelectInput, TextareaInput, TextInput } from "@/components/ui/inputs";
import { FieldError } from "@/components/ui/field";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { EVENT_SEASONS, type EventSeason, type PlantingEvent } from "@/lib/wrt/events/types";
import { NOTES_MAX } from "@/lib/wrt/events/validate";
import { formatNumber } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import { DrawMap } from "./draw-map";
import { SpeciesPicker } from "./species-picker";
import { useEventForm, type ExistingArea } from "./use-event-form";

export function EventForm(props: {
  options: EventFormOptions;
  /** The event being edited, or null for a new one. */
  event: PlantingEvent | null;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
  areas: ExistingArea[];
}) {
  const { options, event, today } = props;
  const formRef = useRef<HTMLFormElement>(null);
  const form = useEventForm({ ...props, formRef });
  const { err, site } = form;
  const uid = useId();
  const heading = (name: string) => `${uid}-${name}`;
  const siteParts = site && site.parts.length > 1 ? site.parts : [];

  return (
    <form ref={formRef} className="ev-form" onSubmit={form.submit} noValidate aria-label={event ? "Edit planting event" : "New planting event"}>
      {Object.keys(form.errors).length > 0 && (
        <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
          {form.errors.form ?? "Some details need fixing before this can be saved. They are marked below."}
        </div>
      )}

      <section className="cn-card ev-section" aria-labelledby={heading("where")}>
        <h2 id={heading("where")} className="cn-card__title">Where</h2>
        <div className="ev-grid">
          <SelectInput label="Site" value={form.placeSlug} error={err("placeSlug")} onChange={(e) => form.chooseSite(e.target.value)}>
            <option value="">Choose a site</option>
            {options.sites.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </SelectInput>
          <SelectInput
            label="Part of site" optional value={form.parcelId ?? ""} disabled={siteParts.length === 0} error={err("parcelId")}
            onChange={(e) => form.setParcelId(e.target.value || null)}
          >
            <option value="">{!site ? "Choose a site first" : siteParts.length === 0 ? "This site has one part" : "The site as a whole"}</option>
            {siteParts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectInput>
        </div>

        <FormField label="Planted area" group error={err("polygon") ?? err("polygon.coordinates")}>
          {(control, labelId) => (
            <div
              role="group" aria-labelledby={labelId} aria-describedby={control["aria-describedby"]}
              data-invalid={control["aria-invalid"]} tabIndex={control["aria-invalid"] ? -1 : undefined}
            >
              <DrawMap polygon={form.polygon} onChange={form.setPolygon} focus={form.focus} others={form.others} invalid={!!control["aria-invalid"]} />
            </div>
          )}
        </FormField>
      </section>

      <section className="cn-card ev-section" aria-labelledby={heading("when")}>
        <h2 id={heading("when")} className="cn-card__title">When</h2>
        <div className="ev-grid ev-grid--3">
          <TextInput
            label="Planting date" type="date" value={form.plantedOn} max={today} error={err("plantedOn")}
            onChange={(e) => form.changeDate(e.target.value)}
          />
          <SelectInput
            label="Season" value={form.season} error={err("season")}
            hint={form.seasonChosen ? "Chosen by you." : "Suggested from the date; change it if WRT counts this planting differently."}
            onChange={(e) => form.chooseSeason(e.target.value as EventSeason)}
          >
            {EVENT_SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </SelectInput>
          <TextInput
            label="Season year" type="number" inputMode="numeric" min={2015} max={2100} value={form.seasonYear} error={err("seasonYear")}
            onChange={(e) => form.changeSeasonYear(e.target.value)}
          />
        </div>
      </section>

      <section className="cn-card ev-section" aria-labelledby={heading("what")}>
        <div className="cn-card__head">
          <h2 id={heading("what")} className="cn-card__title">What was planted</h2>
          <span className="wrt-muted tabular-nums" aria-live="polite">{formatNumber(form.total)} plants</span>
        </div>
        <ol className="ev-lines">
          {form.lines.map((l, i) => (
            <li key={l.key} className="ev-line">
              <FormField label="Species" fieldClassName="ev-line__species" error={err(`species.${i}.speciesId`)}>
                {(control) => (
                  <SpeciesPicker
                    id={control.id} species={options.species} value={l.speciesId} taken={form.taken(l.key)}
                    invalid={!!control["aria-invalid"]} describedBy={control["aria-describedby"]}
                    onChange={(speciesId) => form.updateLine(l.key, { speciesId })}
                  />
                )}
              </FormField>
              <TextInput
                label="Quantity" fieldClassName="ev-line__qty" className="tabular-nums"
                type="number" inputMode="numeric" min={1} step={1} placeholder="0" value={l.quantity}
                error={err(`species.${i}.quantity`)}
                onChange={(e) => form.updateLine(l.key, { quantity: e.target.value })}
              />
              <button
                type="button" className="cn-btn cn-btn--soft cn-btn--sm ev-line__remove"
                disabled={form.lines.length === 1}
                aria-label={`Remove species line ${i + 1}`}
                onClick={() => form.removeLine(l.key)}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
        {err("species") && <FieldError>{err("species")}</FieldError>}
        <div>
          <button type="button" className="cn-btn cn-btn--secondary cn-btn--sm" onClick={form.addLine}>
            Add another species
          </button>
        </div>
      </section>

      <section className="cn-card ev-section" aria-labelledby={heading("more")}>
        <h2 id={heading("more")} className="cn-card__title">Photo and notes</h2>
        <TextInput
          label="Photo" optional type="file" accept="image/*" disabled
          hint="Photo upload will be available once photo storage is connected."
        />
        <TextareaInput
          label="Notes" optional rows={3} maxLength={NOTES_MAX} value={form.notes} error={err("notes")}
          placeholder="Who planted, conditions, anything WRT should know"
          onChange={(e) => form.setNotes(e.target.value)}
        />
      </section>

      <div className={cn("ev-actions", form.pending && "opacity-70")}>
        <button type="submit" className="cn-btn cn-btn--primary" disabled={form.pending}>
          {form.pending ? "Saving…" : event ? "Save changes" : form.total ? `Record ${formatNumber(form.total)} plants` : "Record planting event"}
        </button>
      </div>
    </form>
  );
}
