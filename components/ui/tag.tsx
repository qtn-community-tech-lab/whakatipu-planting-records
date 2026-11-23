import * as React from "react";
import { cn } from "@/lib/utils";

/** A plain label that can't be tapped, so it doesn't look like a button. Anything that links uses Badge or Button. */
export function Tag({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="tag" className={cn("inline-flex items-center text-[13px] font-semibold leading-none", className)} {...props} />;
}
