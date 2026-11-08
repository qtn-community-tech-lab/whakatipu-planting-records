"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { FormField, type FieldProps } from "./form-field";

/**
 * A labelled native <select>. Native on purpose: phones open their own
 * picker for it, which is easier to use in the field than a custom list.
 * For long, searchable lists (species), use the combobox instead.
 */
export function SelectInput({
  label, hint, error, optional, fieldClassName, className, ...props
}: FieldProps & Omit<ComponentProps<"select">, "id">) {
  return (
    <FormField label={label} hint={hint} error={error} optional={optional} fieldClassName={fieldClassName}>
      {(control) => <select data-slot="select" className={cn("wrt-select", className)} {...props} {...control} />}
    </FormField>
  );
}
