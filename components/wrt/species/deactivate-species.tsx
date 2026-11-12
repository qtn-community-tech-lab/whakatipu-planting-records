"use client";

import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SpeciesSubmitResult } from "@/db/types";

export function DeactivateSpecies({
  name,
  onDeactivate,
  children,
}: {
  name: string;
  onDeactivate: () => Promise<SpeciesSubmitResult>;
  children?: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirmationId = useId();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap justify-end gap-2">
        {children}
        <Button
          ref={trigger}
          type="button"
          variant="secondary"
          aria-expanded={confirming}
          aria-controls={confirming ? confirmationId : undefined}
          onClick={() => setConfirming(true)}
        >
          Deactivate Species
        </Button>
      </div>
      {confirming && (
        <div id={confirmationId} className="w-full">
          <DeactivationConfirmation
            name={name}
            onDeactivate={onDeactivate}
            onCancel={() => {
              setConfirming(false);
              trigger.current?.focus();
            }}
          />
        </div>
      )}
    </div>
  );
}

function DeactivationConfirmation({
  name,
  onDeactivate,
  onCancel,
}: {
  name: string;
  onDeactivate: () => Promise<SpeciesSubmitResult>;
  onCancel: () => void;
}) {
  const [result, action, pending] = useActionState(onDeactivate, {});
  return (
    <form action={action} aria-label={`Deactivate ${name}`} aria-busy={pending}>
      <Alert role="region" aria-label="Confirm species deactivation">
        <AlertTitle className="line-clamp-none break-words">
          Deactivate {name}?
        </AlertTitle>
        <AlertDescription>
          <p>
            This species will be hidden from the active register and unavailable
            for new planting lines. Its historical planting records, species
            identity and recorded quantities will remain unchanged. Planting
            totals will stay the same.
          </p>
          <p>
            Deactivated species can be found in the Deactivated register. Contact support to reactivate them.
          </p>
          {result.error && <p role="alert">{result.error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Deactivating…" : "Confirm deactivation"}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </form>
  );
}
