"use client";

import { useEffect, useRef } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Card } from "@/components/wrt/shared/page";
import {
  FieldGroup,
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
import { INPUT_LIMITS } from "@/lib/forms/limits";
import { slugify } from "@/lib/wrt/text";
import {
  speciesSchema,
  type SpeciesEdit,
  type SpeciesInput,
  type SpeciesSubmitResult,
} from "@/db/types";

const flag = z.enum(["unknown", "yes", "no"]);

export const speciesFormSchema = speciesSchema.extend({
  suggested_spelling: speciesSchema.shape.suggested_spelling.unwrap(),
  common_name: speciesSchema.shape.common_name.unwrap(),
  maori_name: speciesSchema.shape.maori_name.unwrap(),
  maori_name_alternatives: z.array(
    z.object({ name: speciesSchema.shape.maori_name_alternatives.element }),
  ),
  summary: speciesSchema.shape.summary.unwrap(),
  look_for: speciesSchema.shape.look_for.unwrap(),
  over_5m: flag,
  threatened: flag,
  contested_group: speciesSchema.shape.contested_group.unwrap(),
});
export type SpeciesFormValues = z.infer<typeof speciesFormSchema>;
export type { SpeciesInput, SpeciesSubmitResult };

export const emptySpecies: SpeciesFormValues = {
  slug: "",
  scientific_name: "",
  suggested_spelling: "",
  common_name: "",
  maori_name: "",
  maori_name_alternatives: [],
  summary: "",
  look_for: "",
  over_5m: "unknown",
  threatened: "no",
  threatened_te_kakano: false,
  needs_decision: false,
  contested_group: "",
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
    maori_name_alternatives: row.maori_name_alternatives.map((name) => ({
      name,
    })),
    summary: row.summary ?? "",
    look_for: row.look_for ?? "",
    over_5m: row.over_5m === null ? "unknown" : row.over_5m ? "yes" : "no",
    threatened:
      row.threatened === null ? "unknown" : row.threatened ? "yes" : "no",
    threatened_te_kakano: row.threatened_te_kakano,
    needs_decision: row.needs_decision,
    contested_group: row.contested_group ?? "",
    photos: Array.isArray(row.photos)
      ? row.photos.flatMap((photo) =>
          photo &&
          typeof photo === "object" &&
          !Array.isArray(photo) &&
          typeof photo.src === "string"
            ? [
                {
                  src: photo.src,
                  attribution:
                    typeof photo.attribution === "string"
                      ? photo.attribution
                      : "",
                },
              ]
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
    needs_decision: false,
    suggested_spelling: nullable(values.suggested_spelling),
    common_name: nullable(values.common_name),
    maori_name: nullable(values.maori_name),
    maori_name_alternatives: values.maori_name_alternatives.map(
      ({ name }) => name,
    ),
    summary: nullable(values.summary),
    look_for: nullable(values.look_for),
    over_5m: boolean(values.over_5m),
    threatened: boolean(values.threatened),
    contested_group: nullable(values.contested_group),
  };
}

const flagOptions = [
  ["unknown", "Not recorded"],
  ["yes", "Yes"],
  ["no", "No"],
] as const;

/** New and edit pages supply defaults to this single form. */
export function SpeciesForm<T extends string>({
  values,
  onSubmit,
  submitLabel = "Save species",
  cancelHref = "/species",
}: {
  values?: SpeciesEdit;
  onSubmit: (species: SpeciesInput) => Promise<SpeciesSubmitResult | void>;
  submitLabel?: string;
  cancelHref?: Route<T>;
}) {
  const form = useForm<SpeciesFormValues>({
    resolver: zodResolver(speciesFormSchema),
    defaultValues: values ? speciesFormValues(values) : emptySpecies,
  });
  const photos = useFieldArray({ control: form.control, name: "photos" });
  const maoriNames = useFieldArray({
    control: form.control,
    name: "maori_name_alternatives",
  });
  const photoValues = useWatch({ control: form.control, name: "photos" });
  const { isSubmitting, errors } = form.formState;
  const firstInvalidField = useRef<FieldPath<SpeciesFormValues> | null>(null);
  const { setFocus } = form;

  useEffect(() => {
    if (!isSubmitting && firstInvalidField.current) {
      setFocus(firstInvalidField.current);
      firstInvalidField.current = null;
    }
  }, [isSubmitting, setFocus]);

  async function handleSubmit(input: SpeciesFormValues) {
    firstInvalidField.current = null;
    form.clearErrors("root");
    try {
      const result = await onSubmit(speciesWriteValues(input));
      if (result?.issues) {
        for (const [index, issue] of result.issues.entries()) {
          const path = issue.path.replace(
            /^maori_name_alternatives\.(\d+)$/,
            "$&.name",
          ) as FieldPath<SpeciesFormValues>;
          form.setError(path, { message: issue.message });
          if (index === 0) firstInvalidField.current = path;
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
    <form
      onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
      className="max-w-3xl"
    >
      <FieldSet disabled={isSubmitting} aria-busy={isSubmitting}>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Species register</FieldLegend>
            <FieldGroup>
              <FormField
                control={form.control}
                name="scientific_name"
                label="Scientific name"
                render={(field, accessibility) => (
                  <Input
                    {...field}
                    {...accessibility}
                    onChange={(event) => {
                      field.onChange(event);
                      // A new species' web address follows its scientific name until staff edit it themselves.
                      if (!values && !form.getFieldState("slug").isDirty)
                        form.setValue("slug", slugify(event.target.value), {
                          shouldValidate: !!errors.slug,
                        });
                    }}
                    maxLength={INPUT_LIMITS.shortText}
                    required
                  />
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                label="Web address name"
                description={
                  values
                    ? "This is a special unique code for the species. It can't be changed after the species is created."
                    : "Generated from the scientific name, this is a special unique code for the species. It becomes the page's address, for example /species/coprosma-propinqua, and can't be changed once saved."
                }
                render={(field, accessibility) => (
                  <Input
                    {...field}
                    {...accessibility}
                    maxLength={INPUT_LIMITS.identifier}
                    readOnly={!!values}
                    required
                  />
                )}
              />
              <FormField
                control={form.control}
                name="suggested_spelling"
                label="Suggested spelling"
                render={(field, accessibility) => (
                  <Input
                    {...field}
                    {...accessibility}
                    maxLength={INPUT_LIMITS.shortText}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="common_name"
                label="Common name"
                render={(field, accessibility) => (
                  <Input
                    {...field}
                    {...accessibility}
                    maxLength={INPUT_LIMITS.shortText}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="maori_name"
                label="Māori name"
                render={(field, accessibility) => (
                  <Input
                    {...field}
                    {...accessibility}
                    maxLength={INPUT_LIMITS.shortText}
                  />
                )}
              />
              <FieldSet>
                <FieldLegend variant="label">
                  Alternative Māori names
                </FieldLegend>
                <FieldDescription>
                  Additional names shown alongside the Māori name in species
                  references and lists.
                </FieldDescription>
                <FieldGroup>
                  {maoriNames.fields.map((entry, index) => (
                    <FormField
                      key={entry.id}
                      control={form.control}
                      name={`maori_name_alternatives.${index}.name`}
                      label={`Alternative Māori name ${index + 1}`}
                      render={(field, accessibility) => (
                        <FieldGroup className="flex-row items-center gap-2">
                          <Input
                            {...field}
                            {...accessibility}
                            className="min-w-0 flex-1"
                            maxLength={INPUT_LIMITS.shortText}
                            required
                          />
                          <Button
                            type="button"
                            variant="soft"
                            className="!size-11 shrink-0 !p-0"
                            aria-label={`Remove Māori name ${index + 1}`}
                            title={`Remove Māori name ${index + 1}`}
                            onClick={() => maoriNames.remove(index)}
                          >
                            <X aria-hidden="true" />
                          </Button>
                        </FieldGroup>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    className="self-start"
                    onClick={() => maoriNames.append({ name: "" })}
                  >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Add alternative Māori name
                  </Button>
                </FieldGroup>
              </FieldSet>
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
              <FormField
                control={form.control}
                name="threatened_te_kakano"
                label="Marked threatened by Te Kākano"
                render={(field, accessibility) => (
                  <Select
                    name={field.name}
                    value={field.value ? "yes" : "no"}
                    onValueChange={(value) => field.onChange(value === "yes")}
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
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Species reference</FieldLegend>
            <FieldGroup>
              <FormField
                control={form.control}
                name="summary"
                label="Summary"
                description="A species overview shown in the About panel, species list and photo guide."
                render={(field, accessibility) => (
                  <Textarea
                    {...field}
                    {...accessibility}
                    maxLength={INPUT_LIMITS.longText}
                    rows={4}
                  />
                )}
              />
              <FormField
                control={form.control}
                name="look_for"
                label="What to look for"
                description="Identification features to help people recognise this species."
                render={(field, accessibility) => (
                  <Textarea
                    {...field}
                    {...accessibility}
                    maxLength={INPUT_LIMITS.longText}
                    rows={4}
                  />
                )}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Images</FieldLegend>
            <FieldDescription>
              Add image URLs and photo credits. The first image is the primary
              image.
            </FieldDescription>
            <FieldGroup>
              {photos.fields.map((photo, index) => {
                const preview =
                  speciesFormSchema.shape.photos.element.shape.src.safeParse(
                    photoValues[index]?.src,
                  );
                return (
                  <Card
                    key={photo.id}
                    title={`Image ${index + 1}`}
                    action={
                      index === 0 ? (
                        <Badge tone="brand">Primary image</Badge>
                      ) : undefined
                    }
                    className="wrt-species-image"
                  >
                    <FieldSet aria-label={`Image ${index + 1}`}>
                      <div className="wrt-species-image__layout">
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
                                maxLength={INPUT_LIMITS.url}
                                required
                              />
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`photos.${index}.attribution`}
                            label="Photo attribution"
                            render={(field, accessibility) => (
                              <Input
                                {...field}
                                {...accessibility}
                                maxLength={INPUT_LIMITS.shortText}
                              />
                            )}
                          />
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
                        <div className="wrt-species-image__preview">
                          {preview.success ? (
                            <Image
                              src={preview.data}
                              fill
                              sizes="(min-width: 640px) 240px, calc(100vw - 80px)"
                              unoptimized
                              alt={`Image ${index + 1} preview`}
                              className="object-contain"
                            />
                          ) : (
                            <Empty>
                              <EmptyDescription>
                                Add an image URL to see a preview.
                              </EmptyDescription>
                            </Empty>
                          )}
                        </div>
                      </div>
                    </FieldSet>
                  </Card>
                );
              })}
              <Button
                type="button"
                variant="secondary"
                className="self-start"
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
