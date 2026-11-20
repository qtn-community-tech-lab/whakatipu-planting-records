/** Public presentation reads, isolated from staff Records, chat and forms. */
import "server-only";
import { cache } from "react";
import { createPublicHistoryQueries } from "@/db/queries/public-history";

export const getPublicWrt = cache(() => createPublicHistoryQueries());
export const getPublicWrtAll = cache(() => createPublicHistoryQueries());
