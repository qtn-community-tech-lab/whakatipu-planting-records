/**
 * The map padding that keeps the chosen site in the space the form leaves:
 * the panel on the left (wide) or the phone sheet at its current snap.
 */
import { SHEET_HEIGHT, type Snap } from "@/components/wrt/shared/form-panel";

/** The form panel's width plus its 12px inset, on the left (keep in step with .side in form-panel.module.css). */
const SIDE = 560 + 12;

interface Padding { top: number; bottom: number; left: number; right: number }

export function paddingFor(wide: boolean, snap: Snap): Padding {
  if (wide) return { top: 96, bottom: 24, left: SIDE, right: 24 };
  // Full screen hides the map; keep the preview's padding under it, ready for coming back.
  return { top: 150, bottom: SHEET_HEIGHT[snap === "full" ? "mid" : snap] - 28, left: 0, right: 0 };
}
