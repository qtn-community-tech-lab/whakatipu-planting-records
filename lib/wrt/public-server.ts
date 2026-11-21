/** Public presentation reads, isolated from staff Records, chat and forms. */
import "server-only";
import { cache } from "react";
import { createPublicHistoryQueries } from "@/db/queries/public-history";
import { reviewShown } from "./server";

export const getPublicWrt = cache(() => createPublicHistoryQueries(reviewShown));
export const getPublicWrtAll = cache(() => createPublicHistoryQueries(() => true));
