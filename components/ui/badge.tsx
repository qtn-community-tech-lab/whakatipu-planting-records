import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** shadcn Badge rendered with Canopy's cn-badge tones. Badges say the consequence, not a code. */
const badgeVariants = cva("cn-badge", {
  variants: {
    tone: {
      ok: "cn-badge--ok",
      review: "cn-badge--behind",
      risk: "cn-badge--risk",
      brand: "cn-badge--brand",
      info: "cn-badge--prod",
      soft: "cn-chip--soft",
    },
    size: { md: "", lg: "cn-badge--lg" },
  },
  defaultVariants: { tone: "ok", size: "md" },
});

export function Badge({ className, tone, size, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
