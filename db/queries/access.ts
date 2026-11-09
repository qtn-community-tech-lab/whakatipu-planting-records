import { cache } from "react";
import { db } from "@/db/client";

/** Checked per request. RLS decides which signed-in users can write. */
// TODO: Implement proper authentication check based on authenticated users
export const isAuthenticated = cache(async () => {
  // TODO Milestone 2 - fix
  return true;
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user !== null;
});
