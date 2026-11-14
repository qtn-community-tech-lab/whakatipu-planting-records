"use client";
/**
 * The page's questions before it changes more than the form: moving the event to another site, discarding a
 * past planting's changes, and leaving unsaved work.
 */
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function LeaveDialogs(p: {
  siteName: string;
  /** Another site, with the event's entries here: they'd move with it. */
  pendingSite: boolean; pendingSiteName: string; onMoveEvent: () => void; onKeepSite: () => void;
  discard: boolean; editTried: boolean; onDiscard: () => void; onKeepEditing: () => void;
  leaving: boolean; leavingTo: string | undefined; partly: boolean; onLeave: () => void; onStay: () => void;
}) {
  const { siteName } = p;
  return (
    <>
      <ConfirmDialog
        open={p.pendingSite} title={`Move this event to ${p.pendingSiteName}?`}
        confirmLabel="Move event" cancelLabel={`Keep ${siteName}`}
        onConfirm={p.onMoveEvent} onCancel={p.onKeepSite}
      >
        What you&apos;ve entered moves with it.
      </ConfirmDialog>
      <ConfirmDialog
        open={p.discard} title="Discard your changes?" confirmLabel="Discard changes" cancelLabel="Keep editing"
        onConfirm={p.onDiscard} onCancel={p.onKeepEditing}
      >
        {p.editTried ? "Some of your changes were saved; the rest will be lost." : "Your changes to this past planting haven't been saved, and will be lost."}
      </ConfirmDialog>
      {/* A new event's entries. */}
      <ConfirmDialog
        open={p.leaving} title="Leave this planting event?" confirmLabel="Leave event" cancelLabel="Keep editing"
        onConfirm={p.onLeave} onCancel={p.onStay}
      >
        {p.partly ? "The event was saved without its plants. What you've entered here will be cleared"
          : "It isn't saved. What you've entered will be cleared"}, and you&apos;ll see {p.leavingTo} instead.
      </ConfirmDialog>
    </>
  );
}
