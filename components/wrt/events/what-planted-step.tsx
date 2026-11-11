"use client";
/** Step 2 of the planting-event form: species lines with quantities, then photo (disabled) and notes. */
import { useId } from "react";
import { TextareaInput, TextInput } from "@/components/ui/inputs";
import { FieldError } from "@/components/ui/field";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { NOTES_MAX } from "@/lib/wrt/events/validate";
import { formatNumber } from "@/lib/wrt/text";
import { NUMBER_FIELD, digits } from "@/components/wrt/shared/fields";
import { SpeciesPicker } from "./species-picker";
import type { EventFormState } from "./use-event-form";

export function WhatPlantedStep({ form, options }: { form: EventFormState; options: EventFormOptions }) {
  const { err } = form;
  const uid = useId();

  return (
    <>
      <section className="cn-card ev-section" aria-labelledby={`${uid}-what`}>
        <div className="cn-card__head">
          <h3 id={`${uid}-what`} className="cn-card__title">Species</h3>
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
                {...NUMBER_FIELD} maxLength={6} placeholder="0" value={l.quantity}
                error={err(`species.${i}.quantity`)}
                onChange={(e) => form.updateLine(l.key, { quantity: digits(e.target.value) })}
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

      <section className="cn-card ev-section" aria-labelledby={`${uid}-more`}>
        <h3 id={`${uid}-more`} className="cn-card__title">Photo and notes</h3>
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
    </>
  );
}
