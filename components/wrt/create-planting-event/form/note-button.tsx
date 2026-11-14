"use client";
import { StickyNote } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { TextareaInput } from "@/components/ui/inputs";
import { NOTES_MAX } from "@/lib/wrt/events/validate";
import { cn } from "@/lib/utils";
import type { EventFormState } from "./use-event-form";
import * as panel from "../panel-classes";

/**
 * The event's note: one button beside Submit, with a dot once there's a note. It opens a box near
 * the top of the screen, clear of a phone's keyboard. The note is kept as it's typed.
 */
export function NoteButton({ form }: { form: EventFormState }) {
  const [open, setOpen] = useState(false);
  if (form.partlySaved && !form.notes) return null; // saved with the event: nothing to add now
  const problem = form.errors.notes?.message;
  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger asChild>
        <button type="button" className={cn(panel.back, "relative grid w-[52px] place-items-center p-0")} data-problem={problem ? "" : undefined} aria-label={form.notes ? "Note (added)" : "Add a note"}>
          <StickyNote size={18} strokeWidth={2.2} aria-hidden="true" />
          {(form.notes || problem) && <span className={cn("absolute top-3 right-3 size-[9px] rounded-full bg-[var(--cn-green-800)] shadow-[0_0_0_2px_var(--surface-soft)]", problem && "bg-[var(--text-risk)]")} aria-hidden="true" />}
        </button>
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[var(--cn-scrim)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <D.Content className="fixed left-1/2 top-[max(16px,8vh)] z-50 flex w-[min(440px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-3 rounded-[22px] bg-white p-5 text-[var(--text-strong)] shadow-[0_24px_60px_rgba(21,38,28,0.35)] data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <D.Title className="m-0 text-[18px] font-extrabold leading-tight">Note for this planting</D.Title>
          <D.Description className="sr-only">Who planted, conditions, anything WRT should know.</D.Description>
          <Controller
            control={form.control} name="notes"
            render={({ field }) => (
              <TextareaInput
                {...field} label="Note" optional rows={5} autoComplete="off" maxLength={NOTES_MAX} error={problem} autoFocus
                placeholder="Who planted, conditions, anything WRT should know" disabled={form.partlySaved}
              />
            )}
          />
          <div className="flex justify-end">
            <D.Close className="cn-btn cn-btn--primary">Done</D.Close>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
