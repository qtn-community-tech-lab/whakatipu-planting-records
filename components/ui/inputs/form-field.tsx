"use client";

import { useId, type ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

/** What every input in this folder takes, on top of its own control props. */
export interface FieldProps {
  label: ReactNode;
  /** Help shown under the control, always visible. */
  hint?: ReactNode;
  /** The validation message, shown under the control. Its presence marks the control invalid. */
  error?: string;
  /** Adds "(optional)" to the label. */
  optional?: boolean;
  /** Class for the field wrapper (layout); the control's own className goes on the control. */
  fieldClassName?: string;
}

/** Attributes the shell hands to its control: spread them onto the input, select, textarea or button. */
export interface ControlProps {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
}

/**
 * The shell every input shares: label, "(optional)", hint and error, with the
 * ids and aria wiring done once here instead of by hand on every field.
 *
 * Children get the control props to spread:
 *   <FormField label="Site" error={err}>{(control) => <select {...control}>…</select>}</FormField>
 *
 * `group` is for a control that is not a single form element (e.g. a map):
 * the label becomes a plain caption, and the child uses `labelId` for
 * aria-labelledby.
 */
export function FormField({
  label, hint, error, optional, fieldClassName, group = false, children,
}: FieldProps & {
  group?: boolean;
  children: (control: ControlProps, labelId: string) => ReactNode;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const text = <>{label}{optional && <span className="wrt-field-optional"> (optional)</span>}</>;

  return (
    <Field className={fieldClassName}>
      {group
        ? <span id={labelId} className="cn-field__label">{text}</span>
        : <FieldLabel id={labelId} htmlFor={id}>{text}</FieldLabel>}
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy }, labelId)}
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
