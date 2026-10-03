"use client";
import * as React from "react";
import { Tooltip as T } from "radix-ui";
import { cn } from "@/lib/utils";

export const TooltipProvider = T.Provider;
export const Tooltip = T.Root;
export const TooltipTrigger = T.Trigger;

export function TooltipContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof T.Content>) {
  return (
    <T.Portal>
      <T.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-[var(--radius-row)] bg-[var(--cn-green-900)] px-3 py-2 text-white shadow-[var(--shadow-popover)]",
          "[font:var(--type-small)]",
          className,
        )}
        {...props}
      />
    </T.Portal>
  );
}
