"use client";

import { Controller, type Control, type ControllerRenderProps, type FieldPath, type FieldValues } from "react-hook-form";
import type { ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

/** Shared accessible field composition; each form chooses its own control. */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control, name, label, description, render,
}: {
  control: Control<T>;
  name: N;
  label: string;
  description?: string;
  render: (field: ControllerRenderProps<T, N>, accessibility: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => ReactNode;
}) {
  return (
    <Controller control={control} name={name} render={({ field, fieldState }) => (
      <Field data-invalid={fieldState.invalid}>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        {render(field, {
          id: name,
          "aria-invalid": fieldState.invalid,
          "aria-describedby": [description && `${name}-description`, fieldState.error && `${name}-error`].filter(Boolean).join(" ") || undefined,
        })}
        {description && <FieldDescription id={`${name}-description`}>{description}</FieldDescription>}
        {fieldState.error && <FieldError id={`${name}-error`} errors={[fieldState.error]} />}
      </Field>
    )} />
  );
}
