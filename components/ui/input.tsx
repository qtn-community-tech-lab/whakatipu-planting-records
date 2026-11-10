import * as React from "react";
import { cn } from "@/lib/utils";

/** shadcn Input rendered with Canopy's cn-input class. Plain: no label or error (see components/ui/inputs). */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn("cn-input", className)} {...props} />;
}

export { Input };
