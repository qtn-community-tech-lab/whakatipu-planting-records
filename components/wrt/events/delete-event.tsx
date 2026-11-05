"use client";
import { useTransition } from "react";
import { deleteEvent } from "@/app/events/actions";

/** Delete with a confirmation. Deleting cannot be undone (there is no history yet). */
export function DeleteEvent({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => startTransition(() => deleteEvent(fd))}
      onSubmit={(e) => {
        if (!window.confirm(`Delete the planting event "${label}"? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="cn-btn cn-btn--soft cn-btn--sm ev-delete" disabled={pending}>
        {pending ? "Deleting…" : "Delete event"}
      </button>
    </form>
  );
}
