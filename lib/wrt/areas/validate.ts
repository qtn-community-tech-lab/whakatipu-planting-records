import { z } from "zod";
import { isClosed, ringSelfIntersects } from "../events/geo";

export const mapPositionSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

const MAX_CORNERS = 499;

/** A single closed GeoJSON ring. Event inputs may include altitude. */
export const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(mapPositionSchema.rest(z.number()))).length(1, { error: "Draw exactly one area, with no holes." }),
}).superRefine(({ coordinates: [ring] }, ctx) => {
  if (!ring) return;
  const corners = ring.length - 1; // The last position repeats the first.
  let message: string | undefined;
  if (corners < 3) message = "An area needs at least three corners.";
  else if (corners > MAX_CORNERS) message = `An area can have at most ${MAX_CORNERS} corners.`;
  else if (!isClosed(ring)) message = "The area's outline is not closed.";
  else if (ringSelfIntersects(ring)) message = "The area's outline crosses itself. Redraw it without crossing lines.";
  if (message) ctx.addIssue({ code: "custom", message });
});
