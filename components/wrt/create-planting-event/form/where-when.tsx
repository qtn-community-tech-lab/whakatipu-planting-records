"use client";
import { Calendar, ChevronRight, Map as MapIcon, MapPin, Pencil, X } from "lucide-react";
import { Controller } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { AreaShape } from "@/components/wrt/shared/area-shape";
import { NAME_FIELD } from "@/components/wrt/shared/fields";
import { Segmented } from "@/components/wrt/shared/segmented";
import { formatPlantedOn, seasonFromDate } from "@/lib/wrt/events/season";
import { fromPin, kmLabel, partBesideSite, plantsOrNone, spotKind } from "@/lib/wrt/text";
import { cn } from "@/lib/utils";
import type { MapEventFormProps, SpotInfo } from "./map-event-form";
import { areaHa, areaName, plantsIn, type DrawnArea, type EventFormState } from "./use-event-form";
import s from "../panel.module.css";
import * as panel from "../panel-classes";

/** "Today, 12 Nov", or "3 Oct 2026": short enough for half a phone's width. */
const shortDate = (date: string, today: string) =>
  date === today ? `Today, ${formatPlantedOn(today).replace(/^\S+ | \d{4}$/g, "")}` : formatPlantedOn(date).replace(/^\S+ /, "");
const SPOT_KINDS = [["near", "New location"], ["part", "New sublocation"]] as const;

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
 * part (tap to open the chooser) and the date with its season, then the areas drawn on the map. Past
 * plantings are on the site's page. A new location gets its name and pin instead of the place row.
 */
export function WhereWhen({ form, today, plantedArea, onChooseSite, placeMenu, spot, spotNear, spotKm, areaKm, nearKm = 0, onAddSpot, onRemoveSpot, spotInfo, onSpotInfo, areas, onShowArea, areasListed, onLocationOnly }: MapEventFormProps & {
  form: EventFormState; spotInfo: SpotInfo; areas: readonly DrawnArea[]; onLocationOnly?: (() => void) | undefined;
}) {
  const { errors } = form;
  // A new location with no site chosen is a new site of its own; it can still be put at one.
  const newSite = !!spot && !form.site;
  const siteProblem = errors.siteSlug?.message ?? errors.partId?.message;
  const partName = form.site?.parts.find((p) => p.id === form.partId)?.name;
  const far = !!spot && !!form.site && spotKm != null && spotKm > nearKm;
  const atKnown = newSite && !!spotNear && spotNear.km <= nearKm;

  return (
    <>
      {/* The map first: where it is; then the place and the date under it (with a site, in one card). */}
      {(spot || !form.site) && plantedArea}
      {!spot && !form.site && (
        <section className={panel.group} aria-label="Site">
          <button type="button" className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-tile)] border-0 bg-[var(--surface-risk)] py-2 pr-3 pl-4 text-left font-sans text-[14px] leading-[1.35] font-semibold text-[var(--text-risk)]" onClick={onChooseSite} data-problem={siteProblem ? "" : undefined}>
            {siteProblem ?? "Choose a site, or tap its pin on the map"}
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </section>
      )}
      {!spot && form.site ? (
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
      {/* Drawn areas far from the event's site: the same quiet note as for a location. */}
      {!spot && form.site && areaKm != null && areaKm > nearKm && (
        <p className="cn-callout cn-callout--note cn-callout--sm" role="status">
          That&apos;s {kmLabel(areaKm)} from {form.site.name}: is that the right site?{" "}
          {onChooseSite && <button type="button" className={panel.inlineLink} onClick={onChooseSite}>Choose a known site</button>}
        </p>
      )}
      {!spot && form.site && ((areas.length > 0 && !areasListed) || errors.partId) && (
        // Parts are switched in the panel's header (or the map's dock); areas are drawn and new locations
        // dropped from the map.
        <section className={panel.group} aria-label="Where it was planted">
          {/* The drawn areas by name, not a count: tap one to see it on the map (where its pencil and Add plants are). */}
          {areas.length > 0 && !areasListed && (
            <ul className={s.areaList} aria-label="Planted areas">
              {areas.map((a, i) => {
                const n = plantsIn(form.lines, a.id);
                return (
                  <li key={a.id}>
                    <button type="button" onClick={() => onShowArea?.(a.id)} aria-label={`${areaName(a, i)}, ${areaHa(a)}, ${plantsOrNone(n).toLowerCase()}: show on the map`}>
                      <AreaShape pts={a.pts} />
                      <span className={panel.cardText}>
                        <b>{areaName(a, i)}</b>
                        <span>{areaHa(a)} · {plantsOrNone(n)}</span>
                      </span>
                      <MapIcon size={18} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {errors.partId && <p className={s.problem} role="alert">{errors.partId.message}</p>}
        </section>
      )}
      {spot && siteProblem && (
        // One line that says what's wrong and opens the chooser.
        <div role="alert">
          <button type="button" className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-tile)] border-0 bg-[var(--surface-risk)] py-2 pr-3 pl-4 text-left font-sans text-[14px] leading-[1.35] font-semibold text-[var(--text-risk)]" onClick={onChooseSite} data-problem="">
            {siteProblem}
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      )}
      {spot && (
        // The new location: its name (type to change it), how near the site's pin it is,
        // what it is to the site, and Cancel / Move pin.
        <div className={cn(panel.card, "flex-col items-stretch gap-3 border-[var(--cn-lime-300)] bg-[#fbfdf1] px-4 pt-[14px] pb-3 max-md:gap-2 max-md:px-3 max-md:py-2.5")}>
          <div className="spot-head flex items-center gap-[14px]">
            <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-row)] bg-[var(--surface-soft)] text-[var(--cn-green-800)] max-md:[.spot-head_&]:hidden" aria-hidden="true"><MapPin size={20} strokeWidth={2} /></span>
            <span className={panel.cardText}>
              <label className={s.spotName}>
                <span className="sr-only">Label for the new location</span>
                <input name="planting-location-label" value={spotInfo.name} placeholder="Location label, e.g. Top terrace" onChange={(e) => onSpotInfo?.({ ...spotInfo, name: e.target.value })} {...NAME_FIELD} enterKeyHint="done" />
                <Pencil size={16} strokeWidth={2.2} />
              </label>
              {/* What it is, and how far from its site's pin (a new site: the nearest pin). */}
              {form.site && spotKm != null ? (
                <span>{spotKind(spotInfo.asPart, form.site.name)} · {fromPin(spotKm, "its pin")}</span>
              ) : newSite && spotNear && <span>New site · nearest {spotNear.label}, {kmLabel(spotNear.km)}</span>}
            </span>
          </div>
          {/* The kind is a choice only for a plain new location near a site (a sublocation or a new site was asked for). */}
          {form.site && !spotInfo.decided && (
            <Segmented
              label={`What this location is to ${form.site.name}`} options={SPOT_KINDS} value={spotInfo.asPart ? "part" : "near"}
              onChange={(kind) => onSpotInfo?.({ ...spotInfo, asPart: kind === "part" })}
            />
          )}
          {/* Placed far from its site, or a new site right by a known one: said quietly, not blocking. */}
          {far && <p className="cn-callout cn-callout--note cn-callout--sm" role="status">That&apos;s {kmLabel(spotKm!)} from {form.site?.name}: is that the right site?</p>}
          {atKnown && <p className="cn-callout cn-callout--note cn-callout--sm" role="status">This is {kmLabel(spotNear!.km)} from {spotNear!.label}: part of it?</p>}
          {/* Back out plainly (the form goes back to the site as it was), or say it's at a site we know. One row. */}
          <div className="spot-actions flex flex-wrap items-center justify-between gap-2">
            {onRemoveSpot && <button type="button" className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-card)] bg-[var(--cn-white)] py-0 pr-[14px] pl-2.5 font-sans text-[14px] leading-[normal] font-semibold text-[var(--text-strong)] hover:bg-[#f3f5ef] max-md:min-h-9 max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:hover:bg-[#f3f5ef]" onClick={onRemoveSpot} aria-label="Cancel new location"><X size={16} strokeWidth={2.6} />Cancel</button>}
            {(newSite || far) && onChooseSite && <button type="button" className={panel.link} onClick={onChooseSite}>Choose a known site</button>}
            {onAddSpot && <button type="button" className={panel.link} onClick={onAddSpot}>Move pin</button>}
          </div>
        </div>
      )}
      {spot && onLocationOnly && (
        // Not every location has a planting yet: it can go in on its own.
        <button type="button" className="flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-tile)] border border-[var(--border-card)] bg-[var(--surface-card)] py-2 pr-[14px] pl-4 text-left font-sans text-[14px] leading-[1.35] font-medium text-[var(--cn-green-800)] hover:bg-[var(--surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cn-green-800)] [&_b]:font-bold" onClick={onLocationOnly}>
          <span><b>No planting yet?</b> Add the location on its own</span>
          <ChevronRight size={18} strokeWidth={2.4} />
        </button>
      )}
    </>
  );
}
