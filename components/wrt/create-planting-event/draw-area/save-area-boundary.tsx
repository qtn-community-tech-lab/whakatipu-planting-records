"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PlantingAreaBoundarySubmitResult, SavePlantingAreaBoundaryInput } from "@/db/types";
import { boundaryFromCorners } from "@/lib/wrt/areas/geometry";
import type { LngLat } from "@/lib/wrt/areas/planted-area";
import s from "./draw-area.module.css";

export function SaveAreaBoundary({ site, area, name, editing, points, onSave, onSaved }: {
  site: string;
  area: string;
  name: string;
  editing: boolean;
  points: LngLat[];
  onSave: (input: SavePlantingAreaBoundaryInput) => Promise<PlantingAreaBoundarySubmitResult>;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save() {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await onSave({ site, area, editing, boundary: boundaryFromCorners(points) });
        const problem = result.error ?? result.issues?.[0]?.message;
        if (problem) {
          setError(problem);
          return;
        }
        setOpen(false);
        onSaved();
      } catch (error) {
        unstable_rethrow(error);
        setError("The boundary could not be saved. Your drawing is still here. Please try again.");
      }
    });
  }

  return (
    <div className={s.actions}>
      <button type="button" onClick={() => { setError(undefined); setOpen(true); }}>{editing ? "Save boundary" : "Save as area boundary"}</button>
      <ConfirmDialog
        open={open}
        title={`Save boundary for ${name}?`}
        confirmLabel="Save boundary"
        pending={pending}
        onConfirm={save}
        onCancel={() => { if (!pending) setOpen(false); }}
      >
        <p>{editing ? "This updates the area's saved boundary on site maps." : "This outline will appear on site maps."}</p>
        {error && <p role="alert" className="mt-2 font-semibold text-destructive">{error}</p>}
      </ConfirmDialog>
    </div>
  );
}
