/** One Supabase client per request, shared by every query on the page. */
import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const db = cache(createClient);
