"use client";
/** Step 1 of the planting-event form: the site, its part, the planted area (placeholder) and the date and season. */
import { useId } from "react";
import { FormField, SelectInput, TextInput } from "@/components/ui/inputs";
import { NUMBER_FIELD, digits } from "@/components/wrt/shared/fields";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { EVENT_SEASONS, type EventSeason } from "@/lib/wrt/events/types";
import { SitePartPicker, SitePicker } from "./site-picker";
import type { EventFormState } from "./use-event-form";

export function WhereWhenStep({ form, options, today }: { form: EventFormState; options: EventFormOptions; today: string }) {
  const { err } = form;
  const uid = useId();

  return (
    <>
      <section className="cn-card ev-section" aria-labelledby={`${uid}-where`}>
        <h3 id={`${uid}-where`} className="cn-card__title">Where</h3>
        <div className="ev-grid">
          <SitePicker label="Site" sites={options.sites} value={form.placeSlug} error={err("placeSlug")} onChange={form.chooseSite} />
          <SitePartPicker
            label="Part of site" optional site={form.site} value={form.parcelId} error={err("parcelId")}
            onChange={form.setParcelId}
          />
        </div>
        <FormField label="Planted area" group>
          {() => <p className="ev-placeholder">Coming in the next PR: you’ll draw the planted area on a map here.</p>}
        </FormField>
      </section>

      <section className="cn-card ev-section" aria-labelledby={`${uid}-when`}>
        <h3 id={`${uid}-when`} className="cn-card__title">When</h3>
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
            label="Season year" {...NUMBER_FIELD} maxLength={4} value={form.seasonYear} error={err("seasonYear")}
            onChange={(e) => form.changeSeasonYear(digits(e.target.value))}
          />
        </div>
      </section>
    </>
  );
}
