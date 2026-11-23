/** Public navigation counts and search names, from one consistent database read. */
import { z } from "zod";
import { publicDb } from "@/db/repository";

const count = z.number().int().nonnegative();
const layoutSummarySchema = z.object({
  siteCount: count,
  speciesCount: count,
  records: count,
  seasons: z.array(
    z.object({
      slug: z.string(),
      label: z.string(),
      year: z.number().int(),
      half: z.enum(["autumn", "spring"]),
      total: count,
      needsReview: count,
      records: count,
    }),
  ),
  places: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      total: count,
      terms: z.array(z.string()),
    }),
  ),
  species: z.array(
    z.object({
      slug: z.string(),
      scientificName: z.string(),
      suggestedSpelling: z.string().nullable(),
      commonName: z.string().nullable(),
      maoriName: z.string().nullable(),
      total: count,
      terms: z.array(z.string()),
    }),
  ),
});

export type LayoutSummary = z.infer<typeof layoutSummarySchema>;

/** Acts as a signed-out visitor; never returns private staff or editor data. */
export async function readLayoutSummary(): Promise<LayoutSummary> {
  const { data } = await publicDb()
    .rpc("read_layout_summary", { show_review: true })
    .throwOnError();
  return layoutSummarySchema.parse(data);
}
