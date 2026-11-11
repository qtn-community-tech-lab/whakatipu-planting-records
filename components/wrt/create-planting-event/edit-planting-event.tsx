"use client";
/**
 * One past planting event, edited in place in its season's details: the date (optional, inside
 * the season and not in the future), how many of each species, species added or taken off, and
 * the notes. Save and Cancel are in the season view's footer: Save submits this form by its id,
 * then a dialog lists what changes before savePlantingEventEdit writes it. Nothing changed, nothing is written.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, X } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { z } from "zod";
import { savePlantingEventEdit, type SeasonPlantingEvents } from "@/app/playground/create-planting-event/actions";
import { FormField } from "@/components/forms/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { SpeciesPicker } from "@/components/wrt/events/species-picker";
import { ListRow } from "@/components/wrt/shared/list-row";
import { digits, NUMBER_FIELD } from "@/components/wrt/shared/fields";
import { plantingEventEditSchema, type PlantingEventEdit } from "@/db/types";
import { INPUT_LIMITS } from "@/lib/forms/limits";
import type { SpeciesOption } from "@/lib/wrt/events/form-options";
import { formatPlantedOn, isIsoDate, plantedOnProblem, seasonDates, seasonMonths } from "@/lib/wrt/events/season";
import { formatNumber } from "@/lib/wrt/text";
import f from "@/components/wrt/events/map-event-form.module.css";

type Event = SeasonPlantingEvents["events"][number];
const quantity = plantingEventEditSchema.shape.lines.element.shape.quantity;

/** The writable schema with what the controls hold: the date "" for none, and quantities as typed. */
function editFormSchema(season: string, today: string) {
  return z.object({
    plantedOn: z.string().superRefine((v, ctx) => {
      const problem = !v ? undefined : isIsoDate(v) ? plantedOnProblem(v, season, today) : "Enter a real date.";
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
    notes: plantingEventEditSchema.shape.notes,
    lines: z.array(z.object({
      id: z.number().nullable(),
      species: z.string(),
      quantity: z.string().superRefine((v, ctx) => {
        const checked = v ? quantity.safeParse(Number(v)) : undefined;
        const problem = !v ? "Enter how many were planted." : checked?.success ? undefined : checked?.error.issues[0]?.message;
        if (problem) ctx.addIssue({ code: "custom", message: problem });
      }),
    })).min(1, "Keep at least one species."),
  });
}
type EditFormValues = z.infer<ReturnType<typeof editFormSchema>>;

const formValues = (e: Event): EditFormValues => ({
  plantedOn: e.plantedOn ?? "",
  notes: e.notes,
  lines: e.lines.map((l) => ({ id: Number(l.id), species: l.species, quantity: String(l.quantity) })),
});

/** Only the writable fields, as the server action takes them. */
const editValues = (v: EditFormValues): PlantingEventEdit => ({
  plantedOn: v.plantedOn || null,
  notes: v.notes,
  lines: v.lines.map((l) => ({ id: l.id, species: l.species, quantity: Number(l.quantity) })),
});

/** What a save would change, a line each; empty when nothing would. */
function changes(e: Event, v: EditFormValues): string[] {
  const was = new Map(e.lines.map((l) => [Number(l.id), l.quantity]));
  const kept = new Set(v.lines.map((l) => l.id));
  const count = (n: number, one: string, many = one) => (n ? [`${n} ${n === 1 ? one : many}`] : []);
  return [
    ...(v.plantedOn !== (e.plantedOn ?? "") ? [v.plantedOn ? `Date: ${formatPlantedOn(v.plantedOn)}` : "Date: removed"] : []),
    ...count(v.lines.filter((l) => l.id !== null && was.get(l.id) !== Number(l.quantity)).length, "quantity changed", "quantities changed"),
    ...count(v.lines.filter((l) => l.id === null).length, "species added"),
    ...count(e.lines.filter((l) => !kept.has(Number(l.id))).length, "species removed"),
    ...(v.notes.trim() !== e.notes.trim() ? ["Notes changed"] : []),
  ];
}

/** The edit form's id, for the footer's Save (`form` attribute). */
export const editFormId = (id: number) => `edit-planting-event-${id}`;

export function EditPlantingEvent({ event, season, today, species, onDone, onSaved, onSaving }: {
  event: Event;
  /** The event's season, e.g. { slug: "autumn-2021", label: "Autumn 2021" }. */
  season: { slug: string; label: string };
  /** NZ today, "YYYY-MM-DD": the latest date allowed. */
  today: string;
  /** The species register, to add species from. */
  species: SpeciesOption[];
  /** Save with nothing changed: back to the read view, nothing written. */
  onDone: () => void;
  onSaved: () => void;
  /** While the save is running, so the footer's Save can show it. */
  onSaving: (saving: boolean) => void;
}) {
  const schema = useMemo(() => editFormSchema(season.slug, today), [season.slug, today]);
  const form = useForm<EditFormValues>({ resolver: zodResolver(schema), defaultValues: formValues(event) });
  const lines = useFieldArray({ control: form.control, name: "lines" });
  const listed = useWatch({ control: form.control, name: "lines" });
  const { errors } = form.formState;
  // Valid values waiting on the dialog, and whether they're being saved.
  const [confirming, setConfirming] = useState<{ values: EditFormValues; lines: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const setBusy = (b: boolean) => { setSaving(b); onSaving(b); };
  // The field to focus once the dialog has closed (it hands focus back to the footer's Save first).
  const focusNext = useRef<FieldPath<EditFormValues> | null>(null);
  useEffect(() => {
    if (confirming || !focusNext.current) return;
    const name = focusNext.current;
    focusNext.current = null;
    const t = setTimeout(() => form.setFocus(name), 0);
    return () => clearTimeout(t);
  }, [confirming, form]);
  // Remounts the species search after each add, so it starts empty again.
  const [adds, setAdds] = useState(0);

  const range = seasonDates(season.slug);
  const latest = range && range.last < today ? range.last : today;
  const months = seasonMonths(season.slug);
  const byId = new Map(species.map((x) => [x.id, x]));
  const taken = new Set(listed.map((l) => l.species));
  // What a species row shows: its line as loaded, or for one just added, the register's names.
  const shownAs = (id: string) => event.lines.find((l) => l.species === id) ?? {
    name: byId.get(id)?.name ?? id, italic: !!byId.get(id)?.isScientific,
    second: byId.get(id)?.isScientific === false ? byId.get(id)!.scientific : null, secondItalic: true, photo: null,
  };

  function addSpecies(id: string) {
    const sp = byId.get(id);
    if (!sp || taken.has(id)) return;
    lines.append(
      { id: null, species: id, quantity: "" },
      { focusName: `lines.${lines.fields.length}.quantity` },
    );
    setAdds((n) => n + 1);
  }

  /** Save, once the form is valid: ask first, or leave if nothing changed. */
  function review(values: EditFormValues) {
    form.clearErrors("root");
    const lines = changes(event, values);
    if (lines.length === 0) onDone();
    else setConfirming({ values, lines });
  }

  async function save() {
    if (!confirming || saving) return;
    setBusy(true);
    try {
      const result = await savePlantingEventEdit(event.id, editValues(confirming.values));
      if (result.issues) {
        for (const issue of result.issues) form.setError(issue.path as FieldPath<EditFormValues>, { message: issue.message });
        focusNext.current = (result.issues[0]?.path as FieldPath<EditFormValues> | undefined) ?? null;
      } else if (result.error) {
        form.setError("root", { message: result.error });
      } else {
        setBusy(false);
        onSaved();
        return;
      }
    } catch (error) {
      unstable_rethrow(error);
      form.setError("root", { message: "The planting event could not be saved. Your changes are still here. Please try again." });
    } finally {
      setBusy(false);
    }
    setConfirming(null);
  }

  const linesError = errors.lines?.message ?? errors.lines?.root?.message;
  return (
    <form id={editFormId(event.id)} onSubmit={form.handleSubmit(review)} aria-label={`Edit ${event.area}`} className={f.group}>
      <fieldset disabled={saving} aria-busy={saving} className="m-0 min-w-0 border-0 p-0">
        <FieldGroup className="gap-5">
          <h3 className="m-0 text-[15px] font-bold leading-tight">{event.area}</h3>

          <FormField
            control={form.control} name="plantedOn" label="Planting date"
            description={`Optional. Any day in ${months ?? season.label}, up to today.`}
            render={(field, accessibility) => (
              <div className="flex flex-col items-start gap-1">
                <div className={`${f.dateRow} w-full`}>
                  <Calendar size={18} strokeWidth={2} />
                  <span className={f.dateText}>
                    <b>{field.value ? formatPlantedOn(field.value) : "No date"}</b>
                    <span>{season.label}</span>
                  </span>
                  <DatePicker
                    {...accessibility} ref={field.ref} onBlur={field.onBlur}
                    value={field.value} {...(range && { min: range.first })} max={latest}
                    onChange={field.onChange} className={`${f.link} ${f.dateChange}`}
                  >
                    {field.value ? "Change" : "Choose"}
                  </DatePicker>
                </div>
                {field.value && <button type="button" className={f.inlineLink} onClick={() => field.onChange("")}>Clear the date</button>}
              </div>
            )}
          />

          <div className="flex flex-col gap-2">
            <h4 className={f.groupTitle}>Species and how many</h4>
            <ul className={f.rows}>
              {lines.fields.map((line, i) => {
                const value = listed[i] ?? line;
                // What it was before this edit, when the quantity has been changed; "New" for a species added.
                const was = value.id === null ? "New" : (() => {
                  const before = event.lines.find((l) => Number(l.id) === value.id)?.quantity;
                  return before !== undefined && String(before) !== value.quantity ? `was ${formatNumber(before)}` : null;
                })();
                const sp = shownAs(value.species);
                const second = sp.second ? (sp.secondItalic ? <i>{sp.second}</i> : sp.second) : null;
                return (
                  <Controller
                    key={line.id} control={form.control} name={`lines.${i}.quantity`}
                    render={({ field, fieldState }) => (
                      <li className={f.row} data-invalid={fieldState.invalid || undefined}>
                        <ListRow
                          photo={sp.photo} initial={sp.name.charAt(0)} title={sp.italic ? <i>{sp.name}</i> : sp.name}
                          subtitle={second || was ? <>{second}{second && was && " · "}{was && <b className="font-semibold text-[var(--cn-green-800)]">{was}</b>}</> : undefined}
                          end={
                            <span className="flex items-center gap-1">
                              <input
                                {...field} {...NUMBER_FIELD} maxLength={6} className={f.rowQty} placeholder="–"
                                aria-label={`${sp.name}: how many planted`} aria-invalid={fieldState.invalid}
                                aria-describedby={fieldState.error ? `lines-${i}-error` : undefined}
                                onChange={(e) => field.onChange(digits(e.target.value))}
                              />
                              <button
                                type="button" className={f.link} aria-label={`Remove ${sp.name}`}
                                onClick={() => lines.remove(i)}
                              >
                                <X size={18} strokeWidth={2.2} aria-hidden="true" />
                              </button>
                            </span>
                          }
                        />
                        {fieldState.error && <span id={`lines-${i}-error`} className={f.rowError} role="alert">{fieldState.error.message}</span>}
                      </li>
                    )}
                  />
                );
              })}
            </ul>
            {linesError && <FieldError>{linesError}</FieldError>}
            <SpeciesPicker key={adds} label="Add species" species={species} value="" taken={taken} onChange={addSpecies} />
          </div>

          <FormField
            control={form.control} name="notes" label="Notes"
            render={(field, accessibility) => (
              <Textarea {...field} {...accessibility} maxLength={INPUT_LIMITS.longText} rows={3} />
            )}
          />

          {errors.root && (
            <Alert variant="destructive">
              <AlertTitle>Unable to save</AlertTitle>
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </fieldset>
      <ConfirmDialog
        open={!!confirming} title={`Save changes to ${event.area}, ${season.label}?`}
        confirmLabel={saving ? "Saving…" : "Save changes"} cancelLabel="Keep editing"
        onConfirm={save} onCancel={() => { if (!saving) setConfirming(null); }}
      >
        <ul>
          {confirming?.lines.map((line) => <li key={line}>{line}</li>)}
          {event.workbook && <li>This event came from the planting workbook; the app will no longer match it.</li>}
        </ul>
      </ConfirmDialog>
    </form>
  );
}
