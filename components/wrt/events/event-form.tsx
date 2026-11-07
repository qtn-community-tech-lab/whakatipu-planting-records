"use client";
/**
 * The "New planting event" form. Nothing is saved yet: submitting checks
 * every field and says whether the details are ready.
 *
 * Fields: site → optional part of site → planted area (a placeholder until the
 * map PR) → planting date →
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
import { EVENT_SEASONS, type EventSeason } from "@/lib/wrt/events/types";
import { NOTES_MAX } from "@/lib/wrt/events/validate";
import { formatNumber } from "@/lib/wrt/text";
import { SitePartPicker, SitePicker } from "./site-picker";
import { SpeciesPicker } from "./species-picker";
import { useEventForm } from "./use-event-form";

export function EventForm(props: {
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
}) {
  const { options, today } = props;
  const formRef = useRef<HTMLFormElement>(null);
  const form = useEventForm({ ...props, formRef });
  const { err, site } = form;
  const uid = useId();
  const heading = (name: string) => `${uid}-${name}`;

  return (
    <form ref={formRef} className="ev-form" onSubmit={form.submit} noValidate aria-label="New planting event">
      {Object.keys(form.errors).length > 0 ? (
        <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
          {form.errors.form ?? "Some details need fixing. They are marked below."}
        </div>
      ) : form.checked && (
        <div className="cn-callout cn-callout--sm" role="status">
          All details look right. Nothing is saved in this prototype.
        </div>
      )}

      <section className="cn-card ev-section" aria-labelledby={heading("where")}>
        <h2 id={heading("where")} className="cn-card__title">Where</h2>
        <div className="ev-grid">
          <SitePicker label="Site" sites={options.sites} value={form.placeSlug} error={err("placeSlug")} onChange={form.chooseSite} />
          <SitePartPicker
            label="Part of site" optional site={site} value={form.parcelId} error={err("parcelId")}
            onChange={form.setParcelId}
          />
        </div>

        <FormField label="Planted area" group>
          {() => <p className="ev-placeholder">Coming in the next PR: you’ll draw the planted area on a map here.</p>}
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
              <SpeciesPicker
                label="Species" fieldClassName="ev-line__species" error={err(`species.${i}.speciesId`)}
                species={options.species} value={l.speciesId} taken={form.taken(l.key)}
                onChange={(speciesId) => form.updateLine(l.key, { speciesId })}
              />
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

      <div className="ev-actions">
        <button type="submit" className="cn-btn cn-btn--primary">
          {form.total ? `Record ${formatNumber(form.total)} plants` : "Record planting event"}
        </button>
      </div>
    </form>
  );
}
