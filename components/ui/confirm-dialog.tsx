"use client";
/**
 * A yes/no question before something that changes more than the form (shadcn's Alert Dialog, on Radix).
 * Focus starts on Cancel; Escape and Cancel call onCancel. The page decides what happens either way.
 */
import type { ReactNode } from "react";
import { AlertDialog as A } from "radix-ui";

export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Cancel", onConfirm, onCancel }: {
  open: boolean;
  title: string;
  /** What will happen, in a sentence or a short list. */
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <A.Root open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <A.Portal>
        <A.Overlay className="fixed inset-0 z-50 bg-[var(--cn-scrim)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <A.Content className="fixed left-1/2 top-1/2 z-50 flex w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[22px] bg-white p-6 text-[var(--text-strong)] shadow-[0_24px_60px_rgba(21,38,28,0.35)] data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0">
          <A.Title className="m-0 text-[20px] font-extrabold leading-tight">{title}</A.Title>
          <A.Description asChild>
            <div className="text-[14.5px] leading-normal text-[var(--text-muted)] [&_ul]:m-0 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">{children}</div>
          </A.Description>
          <div className="mt-2 flex justify-end gap-2.5">
            <A.Cancel className="cn-btn cn-btn--secondary">{cancelLabel}</A.Cancel>
            {/* The page closes the dialog itself; without preventDefault, Action would also call onCancel. */}
            <A.Action className="cn-btn cn-btn--primary" onClick={(e) => { e.preventDefault(); onConfirm(); }}>{confirmLabel}</A.Action>
          </div>
        </A.Content>
      </A.Portal>
    </A.Root>
  );
}
