"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PlantingEventEditResult } from "@/db/types";

export function DeactivatePlantingEvent({
  name,
  onDeactivate,
  disabled,
  onPendingChange,
}: {
  name: string;
  onDeactivate: () => Promise<PlantingEventEditResult>;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  function deactivate() {
    startTransition(async () => {
      onPendingChange?.(true);
      setError(undefined);
      try {
        setError((await onDeactivate()).error);
      } catch (error) {
        unstable_rethrow(error);
        setError(
          "The planting event could not be deactivated. Please try again.",
        );
      } finally {
        onPendingChange?.(false);
      }
    });
  }
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        aria-label="Deactivate planting event"
        disabled={disabled || pending}
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        Deactivate
      </Button>
      <ConfirmDialog
        open={open}
        title={`Deactivate ${name}?`}
        pending={pending}
        confirmLabel={pending ? "Deactivating…" : "Deactivate planting event"}
        onConfirm={deactivate}
        onCancel={() => setOpen(false)}
      >
        <p>
          This event and its species quantities will be excluded from active
          history and actual totals. The saved record, quantities and notes will
          be retained.
        </p>
        <p>
          Unsaved corrections will not be saved. Contact support to reactivate a
          deactivated event.
        </p>
        {error && <p role="alert">{error}</p>}
      </ConfirmDialog>
    </>
  );
}
