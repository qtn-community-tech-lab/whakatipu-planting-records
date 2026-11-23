"use client";

import type { z } from "zod";
import { useRef, useState } from "react";
import { useForm, useFieldArray, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/wrt/shared/page";
import { FormField } from "@/components/forms/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  createSiteSchema,
  editSiteSchema,
  type CreateSiteInput,
  type EditSiteInput,
  type PlantingAreaEdit,
  type PlantingAreaFormValues,
  type SiteSubmitResult,
  type SiteEdit,
} from "@/db/types";
import type { AppRoute } from "@/lib/wrt/routes";
import { INPUT_LIMITS } from "@/lib/forms/limits";
import { slugify } from "@/lib/wrt/text";

type SiteFormProps = {
  submitLabel: string;
  cancelHref: AppRoute;
} & (
  | {
      values?: undefined;
      onSubmit: (
        input: CreateSiteInput,
        savedSiteSlug?: string,
      ) => Promise<SiteSubmitResult>;
    }
  | {
      values: SiteEdit;
      areas: PlantingAreaEdit[];
      onSubmit: (input: EditSiteInput) => Promise<SiteSubmitResult>;
    }
);
const siteFormSchema = editSiteSchema.extend({
  slug: createSiteSchema.shape.slug.optional(),
});
type SiteFormValues = z.infer<typeof siteFormSchema>;

export function SiteForm(props: SiteFormProps) {
  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: props.values
      ? {
          name: props.values.name,
          description: props.values.description,
          areas: props.areas.map((area) => ({
            slug: area.slug,
            name: area.name,
            description: area.description,
            existing: true,
          })),
        }
      : { slug: "", name: "", description: "", areas: [] },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "areas",
  });
  // Snapshots advance only for acknowledged writes; failed rows retain their values.
  const [savedAreas, setSavedAreas] = useState(
    () =>
      new Map<string, PlantingAreaFormValues>(
        form.getValues("areas").map((area) => [area.slug, { ...area }]),
      ),
  );
  const [savedSiteSlug, setSavedSiteSlug] = useState<string>();
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const { isSubmitting, errors } = form.formState;
  // Field arrays mark appended values dirty; track manual address edits by stable row identity.
  const editedAreaAddresses = useRef(new Set<string>());

  function updateAreaAddress(index: number, name: string, siteSlug: string) {
    const row = fields[index];
    if (!row || form.getValues(`areas.${index}.existing`) || editedAreaAddresses.current.has(row.id)) return;
    const areaName = slugify(name);
    form.setValue(`areas.${index}.slug`, areaName ? [siteSlug, areaName].filter(Boolean).join("-") : "", {
      shouldValidate: !!errors.areas?.[index]?.slug,
    });
  }

  function updateAreaAddresses(siteSlug: string) {
    form.getValues("areas").forEach((area, index) => updateAreaAddress(index, area.name, siteSlug));
  }

  async function handleSubmit(input: SiteFormValues) {
    form.clearErrors("root");
    try {
      const pending = input.areas.flatMap((area, index) => {
        const saved = savedAreas.get(area.slug);
        return !area.existing ||
          !saved ||
          saved.name !== area.name ||
          saved.description !== area.description
          ? [{ area, index }]
          : [];
      });
      const result: SiteSubmitResult = props.values
        ? await props.onSubmit(
            editSiteSchema.parse({
              ...input,
              areas: pending.map(({ area }) => area),
            }),
          )
        : await props.onSubmit(
            createSiteSchema.parse({
              ...input,
              areas: pending.map(({ area }) => area),
            }),
            savedSiteSlug,
          );
      if (result.savedSiteSlug) setSavedSiteSlug(result.savedSiteSlug);
      const nextSavedAreas = new Map(savedAreas);
      const completed = result.savedAreas ?? [];
      for (const saved of completed) {
        const submitted = pending[saved.index];
        if (!submitted) continue;
        const area = { ...submitted.area, slug: saved.slug, existing: true };
        nextSavedAreas.set(saved.slug, area);
        form.setValue(`areas.${submitted.index}.slug`, saved.slug);
        form.setValue(`areas.${submitted.index}.existing`, true);
      }
      if (completed.length) {
        setSavedAreas(nextSavedAreas);
        setSavedSlugs((current) => [
          ...new Set([...current, ...completed.map(({ slug }) => slug)]),
        ]);
      }
      const issues = result.issues?.map((issue) => ({
        ...issue,
        path: issue.path.replace(
          /^areas\.(\d+)\./,
          (_, index: string) =>
            `areas.${pending[Number(index)]?.index ?? index}.`,
        ),
      }));
      if (issues) {
        for (const issue of issues) {
          form.setError(issue.path as FieldPath<SiteFormValues>, {
            message: issue.message,
          });
        }
        // Wait for the pending fieldset to be enabled before focusing its control.
        const first = issues[0];
        if (first)
          requestAnimationFrame(() =>
            form.setFocus(first.path as FieldPath<SiteFormValues>),
          );
      }
      if (result.error) form.setError("root", { message: result.error });
    } catch (error) {
      unstable_rethrow(error);
      form.setError("root", {
        message:
          "The site could not be saved. Your changes are still here. Please try again.",
      });
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="max-w-3xl"
      noValidate
    >
      <FieldSet disabled={isSubmitting} aria-busy={isSubmitting}>
        <FieldGroup>
          <FormField
            control={form.control}
            name="name"
            label="Site name"
            render={(field, accessibility) => (
              <Input
                {...field}
                {...accessibility}
                onChange={(event) => {
                  field.onChange(event);
                  // Follow the site name until staff choose their own address or the site is saved.
                  if (!props.values && !savedSiteSlug && !form.getFieldState("slug").isDirty) {
                    const siteSlug = slugify(event.target.value);
                    form.setValue("slug", siteSlug, { shouldValidate: !!errors.slug });
                    updateAreaAddresses(siteSlug);
                  }
                }}
                maxLength={INPUT_LIMITS.shortText}
                required
              />
            )}
          />
          {props.values ? (
            <Field>
              <FieldLabel htmlFor="slug">Web address name</FieldLabel>
              <Input
                id="slug"
                value={props.values.slug}
                maxLength={INPUT_LIMITS.identifier}
                readOnly
              />
              <FieldDescription>
                This unique web address name can&rsquo;t be changed after the site is created.
              </FieldDescription>
            </Field>
          ) : (
            <FormField
              control={form.control}
              name="slug"
              label="Web address name"
              description={
                savedSiteSlug
                  ? "This unique web address name can't be changed after the site is created."
                  : "Generated from the site name, this is a special unique code for the site. It becomes the page's address, for example /sites/lake-hayes, and can't be changed once saved."
              }
              render={(field, accessibility) => (
                <Input
                  {...field}
                  {...accessibility}
                  onChange={(event) => {
                    field.onChange(event);
                    updateAreaAddresses(event.target.value);
                  }}
                  readOnly={!!savedSiteSlug}
                  maxLength={INPUT_LIMITS.identifier}
                  required
                />
              )}
            />
          )}
          <FormField
            control={form.control}
            name="description"
            label="Description"
            description="Optional. Describe the site."
            render={(field, accessibility) => (
              <Textarea
                {...field}
                {...accessibility}
                maxLength={INPUT_LIMITS.longText}
                rows={4}
              />
            )}
          />
          <FieldSet id="areas">
            <FieldLegend>Areas</FieldLegend>
            <FieldDescription>
              Named parts of this site. Save the site and its areas together
              below.
            </FieldDescription>
            <FieldGroup>
              {fields.length === 0 && (
                <p>No areas yet. Add an area to name a part of this site.</p>
              )}
              {fields.map((row, index) => {
                const existing = form.getValues(`areas.${index}.existing`);
                return (
                  <Card
                    key={row.id}
                    id={`area-${row.slug}`}
                    title={`Area ${index + 1}`}
                  >
                    <FieldSet aria-label={`Area ${index + 1}`}>
                      <FieldGroup>
                        <FormField
                          control={form.control}
                          name={`areas.${index}.name`}
                          label="Area name"
                          render={(field, accessibility) => (
                            <Input
                              {...field}
                              {...accessibility}
                              onChange={(event) => {
                                field.onChange(event);
                                updateAreaAddress(index, event.target.value, props.values?.slug ?? savedSiteSlug ?? form.getValues("slug") ?? "");
                              }}
                              maxLength={INPUT_LIMITS.shortText}
                              required
                            />
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`areas.${index}.slug`}
                          label="Area web address name"
                          description={
                            existing
                              ? "Fixed after creation. This identifies the area in its URL."
                              : "Generated from the site web address name and area name, for example lake-hayes-east-bank. Unique across all sites and fixed once saved."
                          }
                          render={(field, accessibility) => (
                            <Input
                              {...field}
                              {...accessibility}
                              onChange={(event) => {
                                editedAreaAddresses.current.add(row.id);
                                field.onChange(event);
                              }}
                              readOnly={existing}
                              maxLength={INPUT_LIMITS.identifier}
                              required
                            />
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`areas.${index}.description`}
                          label="Area description"
                          description="Optional. Describe this part of the site."
                          render={(field, accessibility) => (
                            <Textarea
                              {...field}
                              {...accessibility}
                              maxLength={INPUT_LIMITS.longText}
                              rows={3}
                            />
                          )}
                        />
                        {savedSlugs.includes(
                          form.getValues(`areas.${index}.slug`),
                        ) && (
                          <p role="status">
                            Saved. Any further changes will be included when you
                            retry.
                          </p>
                        )}
                        {!existing && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => remove(index)}
                          >
                            Discard new area
                          </Button>
                        )}
                      </FieldGroup>
                    </FieldSet>
                  </Card>
                );
              })}
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  append({
                    slug: "",
                    name: "",
                    description: "",
                    existing: false,
                  })
                }
              >
                Add area
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
              {savedSiteSlug ? "Save site and areas" : props.submitLabel}
            </Button>
            <Button asChild variant="secondary">
              <Link href={props.cancelHref}>Cancel</Link>
            </Button>
          </div>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
