"use client";
import * as React from "react";
import { Dialog as D } from "radix-ui";
import { cn } from "@/lib/utils";

/** shadcn Sheet using Canopy's right-hand sheet (440px, inset 16px, green-tinted shadow). */
export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;

export function SheetContent({
  className, children, title, eyebrow, subtitle, side = "right", ...props
}: React.ComponentProps<typeof D.Content> & {
  title: React.ReactNode; eyebrow?: React.ReactNode; subtitle?: React.ReactNode; side?: "right" | "left";
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-40 bg-[var(--cn-scrim)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <D.Content
        className={cn(
          "cn-sheet fixed z-50 max-w-[calc(100vw-32px)] data-[state=open]:animate-in data-[state=open]:duration-300",
          side === "right" ? "data-[state=open]:slide-in-from-right" : "right-auto left-[var(--layout-sheet-inset)] data-[state=open]:slide-in-from-left",
          className,
        )}
        {...props}
      >
        <div className="cn-sheet__head">
          <span className="flex flex-col gap-[5px]">
            {eyebrow && <span style={{ font: "600 12.5px/1 var(--font-sans)", color: "var(--text-eyebrow)" }}>{eyebrow}</span>}
            <D.Title className="cn-sheet__title m-0">{title}</D.Title>
            {subtitle && <D.Description className="m-0" style={{ font: "italic 400 14px/1.2 var(--font-sans)", color: "var(--text-muted)" }}>{subtitle}</D.Description>}
          </span>
          <D.Close className="cn-close" aria-label="Close">×</D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
