"use client";
import * as React from "react";
import { Command as C } from "cmdk";
import { cn } from "@/lib/utils";

/** shadcn Command (cmdk) styled with Canopy popover rows. */
export function Command({ className, ...props }: React.ComponentProps<typeof C>) {
  return <C className={cn("flex flex-col", className)} {...props} />;
}

export function CommandInput({ className, ...props }: React.ComponentProps<typeof C.Input>) {
  return <C.Input className={cn("cn-search", className)} {...props} />;
}

export function CommandList({ className, ...props }: React.ComponentProps<typeof C.List>) {
  return <C.List className={cn("max-h-[min(420px,60vh)] overflow-y-auto", className)} {...props} />;
}

export function CommandEmpty(props: React.ComponentProps<typeof C.Empty>) {
  return <C.Empty className="px-3 py-4 [font:var(--type-small)] text-[var(--text-muted)]" {...props} />;
}

export function CommandGroup({ className, ...props }: React.ComponentProps<typeof C.Group>) {
  return (
    <C.Group
      className={cn(
        "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1",
        "[&_[cmdk-group-heading]]:[font:var(--type-table-head)] [&_[cmdk-group-heading]]:text-[var(--text-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function CommandItem({ className, ...props }: React.ComponentProps<typeof C.Item>) {
  return (
    <C.Item
      className={cn(
        "cn-popover__opt cursor-pointer gap-3 data-[selected=true]:bg-[var(--surface-soft)]",
        className,
      )}
      {...props}
    />
  );
}
