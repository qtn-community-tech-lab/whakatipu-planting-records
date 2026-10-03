import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** shadcn Button rendered with Canopy's cn-btn classes. */
const buttonVariants = cva("cn-btn", {
  variants: {
    variant: {
      primary: "cn-btn--primary",
      secondary: "cn-btn--secondary",
      soft: "cn-btn--soft",
    },
    size: { sm: "cn-btn--sm", md: "cn-btn--md", lg: "", xl: "cn-btn--xl" },
  },
  defaultVariants: { variant: "primary", size: "sm" },
});

export function Button({
  className, variant, size, asChild = false, ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
