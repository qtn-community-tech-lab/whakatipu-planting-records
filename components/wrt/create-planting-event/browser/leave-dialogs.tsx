"use client";
/**
 * The page's questions before it changes more than the form: moving a site's pin, an area drawn at another
 * site, moving the event to another site, discarding a past planting's changes, and leaving unsaved work.
 */
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { kmLabel } from "@/lib/wrt/text";

export function LeaveDialogs(p: {
  siteName: string;
  /** The part beside the site's name (see partBesideSite), or "Whole site". */
  partShort: string | undefined;
  part: string | null;
  areas: number;
  /** A site's pin about to move, and how far (km). */
  pinMove: boolean; movedBy: number | null; onMovePin: () => void; onKeepPin: () => void;
  /** An area drawn at another site than the event's: that site's name. */
  areaElsewhere: boolean; areaSite: string | undefined; onNewEventThere: () => void; onKeepDrawing: () => void;
  /** Another site, with the event's entries here: they'd move with it. */
  pendingSite: boolean; pendingSiteName: string; onMoveEvent: () => void; onKeepSite: () => void;
  discard: boolean; editTried: boolean; onDiscard: () => void; onKeepEditing: () => void;
  leaving: boolean; leavingTo: string | undefined; eventUnsaved: boolean; partly: boolean; onLeave: () => void; onStay: () => void;
}) {
  const { siteName, partShort, part, areas } = p;
  return (
    <>
      <ConfirmDialog
        open={p.pinMove} title={`Move the pin for ${partShort && partShort !== "Whole site" ? `${siteName} · ${partShort}` : siteName}?`}
        confirmLabel="Move pin" onConfirm={p.onMovePin} onCancel={p.onKeepPin}
      >
        <ul>
          <li>{part && partShort ? `${partShort}'s` : "The site's main"} location moves here{p.movedBy !== null && `, ${kmLabel(p.movedBy)} from where it was`}, for every planting recorded at it, not just this one.</li>
          <li>Drawn planting areas stay where they are.</li>
          <li>Distances, and which site a new location counts as near, will use the new spot.</li>
          <li>Not saved yet: this prototype can&apos;t store changes.</li>
        </ul>
      </ConfirmDialog>
      <ConfirmDialog
        open={p.areaElsewhere} title={`This area is at ${p.areaSite}`}
        confirmLabel="Start a new event there" cancelLabel="Keep drawing"
        onConfirm={p.onNewEventThere} onCancel={p.onKeepDrawing}
      >
        This planting event is at {siteName}, and an event is at one site. Starting a new event at {p.areaSite} clears what you&apos;ve entered here and keeps this area{areas > 0 && `; ${areas === 1 ? "the other area you drew is" : `the other ${areas} areas you drew are`} removed`}.
      </ConfirmDialog>
      <ConfirmDialog
        open={p.pendingSite} title={`Move this event to ${p.pendingSiteName}?`}
        confirmLabel="Move event" cancelLabel={`Keep ${siteName}`}
        onConfirm={p.onMoveEvent} onCancel={p.onKeepSite}
      >
        What you&apos;ve entered moves with it.{areas > 0 && <> {areas === 1 ? "The area you drew stays where you drew it" : `The ${areas} areas you drew stay where you drew them`}, at {siteName}, but the event would count them as at the new site.</>}
      </ConfirmDialog>
      <ConfirmDialog
        open={p.discard} title="Discard your changes?" confirmLabel="Discard changes" cancelLabel="Keep editing"
        onConfirm={p.onDiscard} onCancel={p.onKeepEditing}
      >
        {p.editTried ? "Some of your changes were saved; the rest will be lost." : "Your changes to this past planting haven't been saved, and will be lost."}
      </ConfirmDialog>
      {/* A new event's entries, or only a drawing under way (it says so). */}
      <ConfirmDialog
        open={p.leaving} title={p.eventUnsaved ? "Leave this planting event?" : "Stop drawing this area?"}
        confirmLabel={p.eventUnsaved ? "Leave event" : "Stop drawing"} cancelLabel={p.eventUnsaved ? "Keep editing" : "Keep drawing"}
        onConfirm={p.onLeave} onCancel={p.onStay}
      >
        {p.partly ? "The event was saved without its plants. What you've entered here will be cleared"
          : p.eventUnsaved ? "It isn't saved. What you've entered will be cleared" : "It isn't finished, and will be cleared"}, and you&apos;ll see {p.leavingTo} instead.
      </ConfirmDialog>
    </>
  );
}
