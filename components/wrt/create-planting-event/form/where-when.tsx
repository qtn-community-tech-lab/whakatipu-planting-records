"use client";
import { Calendar, ChevronRight, MapPin } from "lucide-react";
import { Controller } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { formatPlantedOn, seasonFromDate } from "@/lib/wrt/events/season";
import { partBesideSite } from "@/lib/wrt/text";
import type { MapEventFormProps } from "./map-event-form";
import type { EventFormState } from "./use-event-form";
import s from "../panel.module.css";
import * as panel from "../panel-classes";

/** "Today, 12 Nov", or "3 Oct 2026": short enough for half a phone's width. */
const shortDate = (date: string, today: string) =>
  date === today ? `Today, ${formatPlantedOn(today).replace(/^\S+ | \d{4}$/g, "")}` : formatPlantedOn(date).replace(/^\S+ /, "");

/** The date, and the season it falls in (always the date's). Tap anywhere on it to change the date. */
function When({ form, today }: { form: EventFormState; today: string }) {
  return (
    <section className={panel.group} aria-label="When">
      <Controller
        control={form.control} name="plantedOn"
        render={({ field, fieldState }) => {
          const at = seasonFromDate(field.value);
          const season = at ? `${at.season} ${at.seasonYear}` : "";
          return (
            <>
              {/* The whole tile opens the calendar. The event's row is saved (its plants weren't): the date stays as saved. */}
              <DatePicker
                ref={field.ref} onBlur={field.onBlur} value={field.value} max={today} onChange={field.onChange} className={s.pick} disabled={form.partlySaved}
                aria-label={`${field.value ? formatPlantedOn(field.value) : "No date"}, ${season}: change the planting date`}
                aria-invalid={fieldState.invalid} aria-describedby={fieldState.error ? "plantedOn-error" : undefined}
              >
                <Calendar size={18} strokeWidth={2} aria-hidden="true" />
                <span>
                  {/* Short, to fit half a phone's width (the label above has it in full). */}
                  <b>{field.value ? shortDate(field.value, today) : "Choose a date"}</b>
                  <small>{season}</small>
                </span>
              </DatePicker>
              {fieldState.error && <p id="plantedOn-error" className={s.problem} role="alert">{fieldState.error.message}</p>}
            </>
          );
        }}
      />
    </section>
  );
}

/**
 * Where and when, confirmed up front. The site on a mini map first, then under it the site and
 * part (tap to open the chooser) and the date with its season. Past plantings are on the site's page.
 */
export function WhereWhen({ form, today, plantedArea, onChooseSite, placeMenu }: MapEventFormProps & { form: EventFormState }) {
  const { errors } = form;
  const siteProblem = errors.siteSlug?.message ?? errors.partId?.message;
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
      {form.site && errors.partId && (
        // Parts are switched in the panel's header.
        <section className={panel.group} aria-label="Where it was planted">
          <p className={s.problem} role="alert">{errors.partId.message}</p>
        </section>
      )}
    </>
  );
}
