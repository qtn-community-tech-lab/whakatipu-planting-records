/**
 * The map padding that keeps the chosen site in the space the form leaves:
 * the panel on the left (wide) or the phone sheet at its current snap.
 */
import { sheetHeight, type Snap } from "@/components/wrt/shared/form-panel";

/** The form panel's width plus its 12px inset, on the left (keep in step with .side in form-panel.module.css). */
const SIDE = 560 + 12;

interface Padding { top: number; bottom: number; left: number; right: number }

/** `height`: the screen's (the map's) height, which sets how tall the phone sheet is. */
export function paddingFor(wide: boolean, snap: Snap, height: number): Padding {
  if (wide) return { top: 96, bottom: 24, left: SIDE, right: 24 };
  // Full screen hides the map; keep the preview's padding under it, ready for coming back.
  // Never below 0: MapLibre throws on negative padding (a map not measured yet is 0px tall).
  return { top: 150, bottom: Math.max(0, sheetHeight(snap === "full" ? "mid" : snap, height) - 28), left: 0, right: 0 };
}
