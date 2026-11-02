/**
 * The Supabase client type every query takes. The table and view types come from
 * database.types.ts, generated from the database by `npm run db:types`: never edit it by hand.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./database.types";

export type { Database, Tables };
export type Db = SupabaseClient<Database>;
