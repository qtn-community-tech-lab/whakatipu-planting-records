/**
 * Server-only entry point for planting events. Pages, Server Actions and the
 * CSV export call getEventStore(); this is the ONLY place a store is built.
 *
 * Supabase handoff: construct SupabaseEventStore here instead of
 * JsonEventStore. Nothing else changes.
 */
import "server-only";
import type { EventStore } from "./event-store";
import { DEFAULT_EVENTS_FILE, JsonEventStore } from "./json-event-store";

let store: EventStore | null = null;

export function getEventStore(): EventStore {
  if (!store) {
    if (process.env.VERCEL) {
      // See json-event-store.ts: Vercel's filesystem is read-only and temporary,
      // so saves would fail or silently disappear. Say so once in the logs.
      console.warn("[events] JsonEventStore on Vercel: saves will fail or be lost. Connect the Supabase store.");
    }
    store = new JsonEventStore(process.env.WRT_EVENTS_FILE || DEFAULT_EVENTS_FILE);
  }
  return store;
}
