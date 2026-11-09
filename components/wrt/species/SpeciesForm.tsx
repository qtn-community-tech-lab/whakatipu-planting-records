"use client";

import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FormField } from "@/components/forms/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldDescription,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { z } from "zod";
import {
  speciesSchema,
  type SpeciesEdit,
  type SpeciesInput,
  type SpeciesSubmitResult,
} from "@/db/types";

const text = z.string().trim();
const flag = z.enum(["unknown", "yes", "no"]);

export const speciesFormSchema = speciesSchema.extend({
  suggested_spelling: text,
  common_name: text,
  maori_name: text,
  status: speciesSchema.shape.status.unwrap().or(z.literal("unknown")),
  over_5m: flag,
  threatened: flag,
  contested_group: speciesSchema.shape.contested_group.unwrap(),
  register_note: text,
});
export type SpeciesFormValues = z.infer<typeof speciesFormSchema>;
export type { SpeciesInput, SpeciesSubmitResult };

export const emptySpecies: SpeciesFormValues = {
  slug: "",
  scientific_name: "",
  suggested_spelling: "",
  common_name: "",
  maori_name: "",
  status: "unknown",
  over_5m: "unknown",
  threatened: "unknown",
  threatened_te_kakano: false,
  needs_decision: false,
  contested_group: "",
  register_note: "",
  photos: [],
};

/** Convert a database row to editable strings and tri-state controls. */
export function speciesFormValues(row: SpeciesEdit): SpeciesFormValues {
  return {
    slug: row.slug,
    scientific_name: row.scientific_name,
    suggested_spelling: row.suggested_spelling ?? "",
    common_name: row.common_name ?? "",
    maori_name: row.maori_name ?? "",
    status: row.status ?? "unknown",
    over_5m: row.over_5m === null ? "unknown" : row.over_5m ? "yes" : "no",
    threatened:
      row.threatened === null ? "unknown" : row.threatened ? "yes" : "no",
    threatened_te_kakano: row.threatened_te_kakano,
    needs_decision: row.needs_decision,
    contested_group: row.contested_group ?? "",
    register_note: row.register_note ?? "",
    photos: Array.isArray(row.photos)
      ? row.photos.flatMap((photo) =>
          photo &&
          typeof photo === "object" &&
          !Array.isArray(photo) &&
          typeof photo.src === "string"
            ? [{ src: photo.src, attribution: typeof photo.attribution === "string" ? photo.attribution : "" }]
            : [],
        )
      : [],
  };
}

/** Explicit writable fields: never accept audit columns or legacy codes from a form. */
export function speciesWriteValues(values: SpeciesFormValues): SpeciesInput {
  const nullable = (value: string) => value || null;
  const boolean = (value: "unknown" | "yes" | "no") =>
    value === "unknown" ? null : value === "yes";
  return {
    ...values,
    suggested_spelling: nullable(values.suggested_spelling),
    common_name: nullable(values.common_name),
    maori_name: nullable(values.maori_name),
    status: values.status === "unknown" ? null : values.status,
    over_5m: boolean(values.over_5m),
    threatened: boolean(values.threatened),
    contested_group: nullable(values.contested_group),
    register_note: nullable(values.register_note),
  };
}

const flagOptions = [
  ["unknown", "Not recorded"],
  ["yes", "Yes"],
  ["no", "No"],
] as const;
const statusOptions = [
  ["unknown", "Not recorded"],
  ["core", "Core"],
  ["appended", "Appended"],
  ["contested", "Contested"],
  ["seedlog_only", "Seed log only"],
] as const;

/** New and edit pages supply defaults to this single form. */
export function SpeciesForm({
  values,
  onSubmit,
  submitLabel = "Save species",
  cancelHref = "/species",
}: {
  values?: SpeciesEdit;
  onSubmit: (species: SpeciesInput) => Promise<SpeciesSubmitResult | void>;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const form = useForm<SpeciesFormValues>({
    resolver: zodResolver(speciesFormSchema),
    defaultValues: values ? speciesFormValues(values) : emptySpecies,
  });
  const photos = useFieldArray({ control: form.control, name: "photos" });
  const photoValues = useWatch({ control: form.control, name: "photos" });
  const { isSubmitting, errors } = form.formState;

  async function handleSubmit(input: SpeciesFormValues) {
    form.clearErrors("root");
    try {
      const result = await onSubmit(speciesWriteValues(input));
      if (result?.issues) {
        for (const [index, issue] of result.issues.entries()) {
          form.setError(
            issue.path as FieldPath<SpeciesFormValues>,
            { message: issue.message },
            { shouldFocus: index === 0 },
          );
        }
      } else if (result?.error) {
        form.setError("root", { message: result.error });
      }
    } catch (error) {
      unstable_rethrow(error);
      form.setError("root", {
        message:
          "The species could not be saved. Your changes are still here. Please try again.",
      });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-3xl">
      <FieldSet disabled={isSubmitting} aria-busy={isSubmitting}>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Species register</FieldLegend>
            <FieldGroup>
              <FormField
                control={form.control}
                name="slug"
                label="Slug"
                description="Slugs must be unique. Use lowercase letters, numbers and hyphens, for example coprosma-propinqua. Changing a slug changes the species URL."
                render={(field, accessibility) => (
                  <Input {...field} {...accessibility} required />
                )}
              />
              <FormField
                control={form.control}
                name="scientific_name"
                label="Scientific name"
                render={(field, accessibility) => (
                  <Input {...field} {...accessibility} required />
                )}
              />
              <FormField
                control={form.control}
                name="suggested_spelling"
                label="Suggested spelling"
                render={(field, accessibility) => (
                  <Input {...field} {...accessibility} />
                )}
              />
              <FormField
                control={form.control}
                name="common_name"
                label="Common name"
                render={(field, accessibility) => (
                  <Input {...field} {...accessibility} />
                )}
              />
              <FormField
                control={form.control}
                name="maori_name"
                label="Māori name"
                render={(field, accessibility) => (
                  <Input {...field} {...accessibility} />
                )}
              />
              <FormField
                control={form.control}
                name="status"
                label="Register status"
                render={(field, accessibility) => (
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      {...accessibility}
                      ref={field.ref}
                      onBlur={field.onBlur}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {statusOptions.map(([value, title]) => (
                          <SelectItem key={value} value={value}>
                            {title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FormField
                control={form.control}
                name="over_5m"
                label="Grows over 5 metres"
                render={(field, accessibility) => (
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      {...accessibility}
                      ref={field.ref}
                      onBlur={field.onBlur}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {flagOptions.map(([value, title]) => (
                          <SelectItem key={value} value={value}>
                            {title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FormField
                control={form.control}
                name="threatened"
                label="Marked threatened in Plants Out Master"
                render={(field, accessibility) => (
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      {...accessibility}
                      ref={field.ref}
                      onBlur={field.onBlur}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {flagOptions.map(([value, title]) => (
                          <SelectItem key={value} value={value}>
                            {title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldSet>
                <FieldLegend variant="label">Register flags</FieldLegend>
                <FieldGroup data-slot="checkbox-group">
                  {(
                    [
                      [
                        "threatened_te_kakano",
                        "Marked threatened by Te Kākano",
                      ],
                      ["needs_decision", "Name needs a WRT decision"],
                    ] as const
                  ).map(([name, label]) => (
                    <Controller
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field, fieldState }) => (
                        <Field
                          orientation="horizontal"
                          data-invalid={fieldState.invalid}
                        >
                          <Checkbox
                            id={name}
                            name={name}
                            checked={field.value}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                            ref={field.ref}
                            onBlur={field.onBlur}
                            aria-invalid={fieldState.invalid}
                          />
                          <FieldLabel htmlFor={name}>{label}</FieldLabel>
                          {fieldState.error && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  ))}
                </FieldGroup>
              </FieldSet>
              <FormField
                control={form.control}
                name="contested_group"
                label="Contested group"
                description="For example C3. Leave blank if this name is not part of a contested group."
                render={(field, accessibility) => (
                  <Input {...field} {...accessibility} />
                )}
              />
              <FormField
                control={form.control}
                name="register_note"
                label="Register notes"
                render={(field, accessibility) => (
                  <Textarea {...field} {...accessibility} rows={3} />
                )}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Images</FieldLegend>
            <FieldDescription>
              Add image URLs and photo credits. The first image is the primary image.
            </FieldDescription>
            <FieldGroup>
              {photos.fields.map((photo, index) => (
                <FieldSet key={photo.id}>
                  <FieldLegend variant="label">Image {index + 1}</FieldLegend>
                  <FieldGroup>
                    <FormField
                      control={form.control}
                      name={`photos.${index}.src`}
                      label="Image URL"
                      render={(field, accessibility) => (
                        <Input
                          {...field}
                          {...accessibility}
                          type="url"
                          required
                        />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`photos.${index}.attribution`}
                      label="Photo attribution"
                      render={(field, accessibility) => (
                        <Input {...field} {...accessibility} />
                      )}
                    />
                    {speciesFormSchema.shape.photos.element.shape.src.safeParse(
                      photoValues[index]?.src,
                    ).success && (
                      <div className="relative h-48">
                        <Image
                          src={photoValues[index].src}
                          fill
                          sizes="(max-width: 768px) 100vw, 768px"
                          unoptimized
                          alt={`Image ${index + 1} preview`}
                          className="object-contain"
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="soft"
                        disabled={index === 0}
                        onClick={() => photos.move(index, index - 1)}
                        aria-label={`Move image ${index + 1} up`}
                      >
                        Move up
                      </Button>
                      <Button
                        type="button"
                        variant="soft"
                        disabled={index === photos.fields.length - 1}
                        onClick={() => photos.move(index, index + 1)}
                        aria-label={`Move image ${index + 1} down`}
                      >
                        Move down
                      </Button>
                      <Button
                        type="button"
                        variant="soft"
                        onClick={() => photos.remove(index)}
                      >
                        Remove image {index + 1}
                      </Button>
                    </div>
                  </FieldGroup>
                </FieldSet>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => photos.append({ src: "", attribution: "" })}
              >
                Add image
              </Button>
            </FieldGroup>
          </FieldSet>
          {errors.root && (
            <Alert variant="destructive">
              <AlertTitle>Unable to save</AlertTitle>
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}{" "}
              {submitLabel}
            </Button>
            <Button asChild variant="secondary">
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          </div>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
