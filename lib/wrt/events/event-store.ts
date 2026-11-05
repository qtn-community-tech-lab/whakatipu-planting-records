/**
 * The seam between planting-event storage and the rest of the app.
 *
 * WHAT
 *   Every read and write of planting events goes through this interface.
 *   Pages, Server Actions and the CSV export call getEventStore()
 *   (lib/wrt/events/server.ts) and never know what is behind it.
 *
 * WHY
 *   Storage is changing. The prototype saves to a local JSON file
 *   (JsonEventStore); Supabase Postgres is arriving in a separate PR. When it
 *   does, a SupabaseEventStore implements this same interface, one line in
 *   server.ts changes, and nothing in app/ or components/ is touched.
 *
 * HOW (contract every implementation must keep; tests/events-store.test.ts checks it)
 *   - Input is already validated (validateEventInput); stores do not re-check business rules.
 *   - create() assigns id (UUID), createdAt and updatedAt, and sets photoUrl to null.
 *   - update() keeps id and createdAt, refreshes updatedAt, and returns null for an unknown id.
 *   - delete() returns false for an unknown id (never throws for "not found").
 *   - list() and listByPlace() return newest planting first (plantedOn desc, then createdAt desc).
 *   - Returned objects are copies: mutating them must not change stored data.
 */
import type { PlantingEvent, PlantingEventInput } from "./types";

export interface EventStore {
  list(): Promise<PlantingEvent[]>;
  /** Events at one site, used to show its other areas faintly while drawing. */
  listByPlace(placeSlug: string): Promise<PlantingEvent[]>;
  get(id: string): Promise<PlantingEvent | null>;
  create(input: PlantingEventInput): Promise<PlantingEvent>;
  update(id: string, input: PlantingEventInput): Promise<PlantingEvent | null>;
  delete(id: string): Promise<boolean>;
}

/** The ordering every store returns (newest planting first). */
export function byNewestPlanting(a: PlantingEvent, b: PlantingEvent): number {
  return b.plantedOn.localeCompare(a.plantedOn) || b.createdAt.localeCompare(a.createdAt);
}
