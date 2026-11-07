import * as React from "react";
import { cn } from "@/lib/utils";

/** shadcn Textarea rendered with Canopy's cn-input class. Plain: no label or error (see components/ui/inputs). */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn("cn-input wrt-textarea", className)} {...props} />;
}

export { Textarea };
