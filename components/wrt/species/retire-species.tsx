"use client";

import { useActionState, useId, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SpeciesSubmitResult } from "@/db/types";

export function RetireSpecies({ name, onRetire }: {
  name: string;
  onRetire: () => Promise<SpeciesSubmitResult>;
}) {
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirmationId = useId();

  return (
    <div className="flex flex-col items-start gap-3">
      <Button ref={trigger} type="button" variant="secondary" aria-expanded={confirming}
        aria-controls={confirming ? confirmationId : undefined} onClick={() => setConfirming(true)}>
        Retire species
      </Button>
      {confirming && <div id={confirmationId} className="w-full">
        <RetirementConfirmation name={name} onRetire={onRetire} onCancel={() => {
          setConfirming(false);
          trigger.current?.focus();
        }} />
      </div>}
    </div>
  );
}

function RetirementConfirmation({ name, onRetire, onCancel }: {
  name: string;
  onRetire: () => Promise<SpeciesSubmitResult>;
  onCancel: () => void;
}) {
  const [result, action, pending] = useActionState(onRetire, {});
  return (
    <form action={action} aria-label={`Retire ${name}`} aria-busy={pending}>
      <Alert role="region" aria-label="Confirm species retirement">
        <AlertTitle className="line-clamp-none break-words">Retire {name}?</AlertTitle>
        <AlertDescription>
          <p>This species will be hidden from the active register and unavailable for new planting lines.
            Its historical planting records, species identity and recorded quantities will remain unchanged.
            Planting totals will stay the same.</p>
          <p>Retired species can be found in the Retired register. Restoring them is not available.</p>
          {result.error && <p role="alert">{result.error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Retiring…" : "Confirm retirement"}</Button>
          </div>
        </AlertDescription>
      </Alert>
    </form>
  );
}
