"use client";

import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { FormField } from "@/components/forms/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
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
  type SiteEdit,
  type SiteSubmitResult,
} from "@/db/types";
import type { AppRoute } from "@/lib/wrt/routes";
import { INPUT_LIMITS } from "@/lib/forms/limits";

type SiteFormProps = {
  submitLabel: string;
  cancelHref: AppRoute;
} & (
  | {
      values?: undefined;
      onSubmit: (input: CreateSiteInput) => Promise<SiteSubmitResult>;
    }
  | {
      values: SiteEdit;
      onSubmit: (input: EditSiteInput) => Promise<SiteSubmitResult>;
    }
);
type SiteFormValues = CreateSiteInput | EditSiteInput;

export function SiteForm(props: SiteFormProps) {
  const form = useForm<SiteFormValues>({
    resolver: zodResolver(props.values ? editSiteSchema : createSiteSchema),
    defaultValues: props.values
      ? { name: props.values.name, description: props.values.description }
      : { slug: "", name: "", description: "" },
  });
  const { isSubmitting, errors } = form.formState;

  async function handleSubmit(input: SiteFormValues) {
    form.clearErrors("root");
    try {
      const result = props.values
        ? await props.onSubmit(editSiteSchema.parse(input))
        : await props.onSubmit(createSiteSchema.parse(input));
      if (result.issues) {
        for (const issue of result.issues) {
          form.setError(issue.path as FieldPath<SiteFormValues>, {
            message: issue.message,
          });
        }
        // Wait for the pending fieldset to be enabled before focusing its control.
        const first = result.issues[0];
        if (first)
          requestAnimationFrame(() =>
            form.setFocus(first.path as FieldPath<SiteFormValues>),
          );
      } else if (result.error) form.setError("root", { message: result.error });
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
          {props.values ? (
            <Field>
              <FieldLabel htmlFor="slug">Slug</FieldLabel>
              <Input id="slug" value={props.values.slug} maxLength={INPUT_LIMITS.identifier} readOnly />
              <FieldDescription>
                The site&rsquo;s slug is fixed after creation.
              </FieldDescription>
            </Field>
          ) : (
            <FormField
              control={form.control}
              name="slug"
              label="Slug"
              description="Use a unique slug with lowercase letters, numbers and single hyphens, for example lake-hayes. This sets the site URL and is fixed after creation."
              render={(field, accessibility) => (
                <Input {...field} {...accessibility} maxLength={INPUT_LIMITS.identifier} required />
              )}
            />
          )}
          <FormField
            control={form.control}
            name="name"
            label="Site name"
            render={(field, accessibility) => (
              <Input {...field} {...accessibility} maxLength={INPUT_LIMITS.shortText} required />
            )}
          />
          <FormField
            control={form.control}
            name="description"
            label="Description"
            description="Optional. Describe the site."
            render={(field, accessibility) => (
              <Textarea {...field} {...accessibility} maxLength={INPUT_LIMITS.longText} rows={4} />
            )}
          />
          {errors.root && (
            <Alert variant="destructive">
              <AlertTitle>Unable to save</AlertTitle>
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}{" "}
              {props.submitLabel}
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
