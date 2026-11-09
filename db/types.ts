/**
 * The Supabase client type every query takes. The table and view types come from
 * database.types.ts, generated from the database by `npm run db:types`: never edit it by hand.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./database.types";
import { z } from "zod";

export type { Database, Tables };
export type Db = SupabaseClient<Database>;

const text = z.string().trim();
const url = z.url({ protocol: /^https$/i, error: "Enter a valid HTTPS URL." });

/** Writable species data, validated in both page submit handlers. */
export const speciesSchema = z.object({
  slug: text.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.")
    .refine((value) => !["new", "photos"].includes(value), "This slug is reserved. Choose another."),
  scientific_name: text.min(1, "Enter a scientific name."),
  suggested_spelling: text.nullable(), common_name: text.nullable(), maori_name: text.nullable(),
  status: z.enum(["core", "appended", "contested", "seedlog_only"]).nullable(),
  over_5m: z.boolean().nullable(), threatened: z.boolean().nullable(),
  threatened_te_kakano: z.boolean(), needs_decision: z.boolean().transform((): boolean => false),
  contested_group: text.regex(/^(C[0-9]+)?$/, "Use a group such as C3, or leave blank.").nullable(),
  register_note: text.nullable(),
  photos: z.array(z.object({ src: url, attribution: text })),
});

export type SpeciesInput = z.infer<typeof speciesSchema>;
export type SpeciesEdit = Pick<Tables<"species">, keyof SpeciesInput | "updated_at">;
export type SpeciesSubmitResult = { error?: string; issues?: { path: string; message: string }[] };
