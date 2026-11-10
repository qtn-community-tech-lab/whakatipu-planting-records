"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { FormField, type FieldProps } from "./form-field";

/** A labelled input for anything typed: text, date, number, file. Set `type` as on a plain input. */
export function TextInput({
  label, hint, error, optional, fieldClassName, ...props
}: FieldProps & Omit<ComponentProps<typeof Input>, "id">) {
  return (
    <FormField label={label} hint={hint} error={error} optional={optional} fieldClassName={fieldClassName}>
      {(control) => <Input {...props} {...control} />}
    </FormField>
  );
}
