import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * shadcn Field, rendered with Canopy's cn-field classes. Only the parts this
 * app uses: the wrapper, its label, a hint and an error. Wiring ids and aria
 * between them is done once, in components/ui/inputs/form-field.tsx.
 */
function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field" className={cn("cn-field", className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={className} {...props} />;
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("cn-field__hint m-0", className)} {...props} />;
}

function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  return <p role="alert" data-slot="field-error" className={cn("wrt-field-error m-0", className)} {...props} />;
}

export { Field, FieldLabel, FieldDescription, FieldError };
