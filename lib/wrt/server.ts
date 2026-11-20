/** Server-only queries over the complete planting history. */
import "server-only";
import { cache } from "react";
import { SupabaseWrtRepository } from "@/db/repository";
import { createQueries } from "./queries";

/** Layout and pages share the same history load within this request. */
export const getWrt = cache(() => createQueries(new SupabaseWrtRepository()));
