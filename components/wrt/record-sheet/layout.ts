/**
 * The map padding that keeps the chosen site in the space the form leaves:
 * the panel on the right (wide) or the bottom drawer at its current snap.
 */
import { MID, type Snap } from "@/components/wrt/shared/form-panel";

/** The form panel's width plus its 12px inset (keep in step with .side in form-panel.module.css). */
export const SIDE = 560 + 12;

export interface Padding { top: number; bottom: number; left: number; right: number }

export function paddingFor(wide: boolean, snap: Snap): Padding {
  if (wide) return { top: 96, bottom: 24, left: 24, right: SIDE };
  // The tallest snap is a fraction of the screen; the map keeps the two-thirds padding under it.
  const height = parseInt(typeof snap === "string" ? snap : MID);
  return { top: 150, bottom: height - 28, left: 0, right: 0 };
}

/** The same padding with a margin round it. */
export function withMargin(p: Padding, margin: number): Padding {
  return { top: p.top + margin, bottom: p.bottom + margin, left: p.left + margin, right: p.right + margin };
}
