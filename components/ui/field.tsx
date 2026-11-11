import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * shadcn Field, rendered with Canopy's cn-field classes. Only the parts this
 * app uses: groups, the wrapper, its label, a hint and an error. Wiring ids and aria
 * between them is done once, in components/ui/inputs/form-field.tsx.
 */
function Field({ className, orientation = "vertical", ...props }: React.ComponentProps<"div"> & { orientation?: "vertical" | "horizontal" }) {
  return <div data-slot="field" data-orientation={orientation} className={cn("cn-field", orientation === "horizontal" && "flex flex-row items-center gap-3", className)} {...props} />;
}

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return <fieldset data-slot="field-set" className={cn("flex min-w-0 flex-col gap-6", className)} {...props} />;
}

function FieldLegend({ className, variant = "legend", ...props }: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return <legend data-slot="field-legend" data-variant={variant} className={cn("mb-4 font-medium", className)} {...props} />;
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("flex flex-col gap-6", className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={className} {...props} />;
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("cn-field__hint m-0", className)} {...props} />;
}

function FieldError({ className, children, errors, ...props }: React.ComponentProps<"p"> & { errors?: ({ message?: string } | undefined)[] }) {
  const content = children ?? errors?.map((error) => error?.message).filter(Boolean).join(" ");
  if (!content) return null;
  return <p role="alert" data-slot="field-error" className={cn("wrt-field-error m-0", className)} {...props}>{content}</p>;
}

export { Field, FieldSet, FieldLegend, FieldGroup, FieldLabel, FieldDescription, FieldError };
