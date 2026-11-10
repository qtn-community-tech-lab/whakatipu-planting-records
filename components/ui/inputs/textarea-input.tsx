"use client";

import type { ComponentProps } from "react";
import { Textarea } from "@/components/ui/textarea";
import { FormField, type FieldProps } from "./form-field";

/** A labelled multi-line text box. */
export function TextareaInput({
  label, hint, error, optional, fieldClassName, ...props
}: FieldProps & Omit<ComponentProps<typeof Textarea>, "id">) {
  return (
    <FormField label={label} hint={hint} error={error} optional={optional} fieldClassName={fieldClassName}>
      {(control) => <Textarea {...props} {...control} />}
    </FormField>
  );
}
