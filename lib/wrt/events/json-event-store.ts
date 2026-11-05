/**
 * JsonEventStore — TEMPORARY local storage for planting events.
 *
 * WHY THIS EXISTS
 *   The app has no database yet. Supabase Postgres is being added in a
 *   separate PR; until it lands, this lets the "New planting event" form be
 *   built and tried end to end on a developer's machine. It is a stand-in,
 *   not a design: delete it (or keep it for tests) once SupabaseEventStore exists.
 *
 * WHY IT DOES NOT WORK ON VERCEL
 *   Vercel functions run on a read-only filesystem (only /tmp is writable,
 *   and /tmp is wiped between invocations and not shared across instances).
 *   Saving there would appear to work and then lose data. So on Vercel the
 *   app should use the Supabase store; server.ts says so loudly if it is not.
 *
 * WHAT IT DOES
 *   Keeps every event in one JSON file (default data/local/planting-events.json,
 *   gitignored; override with WRT_EVENTS_FILE):
 *     { "version": 1, "events": [ PlantingEvent, ... ] }
 *
 * HOW IT STAYS SAFE ENOUGH FOR ONE DEVELOPER
 *   - Atomic writes: the whole file is written to "<file>.tmp" and then renamed
 *     over the original, so a crash mid-write never leaves half a file.
 *   - One write at a time: writes queue on a promise chain inside this process,
 *     so two quick saves cannot overwrite each other's changes. (It does NOT
 *     protect against two separate server processes sharing the file. Fine for
 *     `next dev`; that is exactly what Postgres is for.)
 *   - Reads go to disk each time, so edits made by hand to the file show up.
 *
 * WHAT THE SUPABASE STORE MUST KEEP THE SAME
 *   Everything in the EventStore contract (lib/wrt/events/event-store.ts):
 *   ids are UUIDs, timestamps are ISO strings, photoUrl starts null, ordering is
 *   newest planting first, "not found" returns null/false. Run the shared
 *   contract tests in tests/events-store.test.ts against it.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { byNewestPlanting, type EventStore } from "./event-store";
import type { PlantingEvent, PlantingEventInput } from "./types";

export const DEFAULT_EVENTS_FILE = path.join(process.cwd(), "data", "local", "planting-events.json");

interface FileShape {
  version: 1;
  events: PlantingEvent[];
}

/** Deep copy so callers can never mutate what is stored. */
const copy = <T>(v: T): T => structuredClone(v);

export class JsonEventStore implements EventStore {
  /** The tail of the write queue: each write waits for the one before it. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string = DEFAULT_EVENTS_FILE) {}

  async list(): Promise<PlantingEvent[]> {
    return (await this.read()).sort(byNewestPlanting);
  }

  async listByPlace(placeSlug: string): Promise<PlantingEvent[]> {
    return (await this.list()).filter((e) => e.placeSlug === placeSlug);
  }

  async get(id: string): Promise<PlantingEvent | null> {
    return (await this.read()).find((e) => e.id === id) ?? null;
  }

  create(input: PlantingEventInput): Promise<PlantingEvent> {
    return this.write((events) => {
      const now = new Date().toISOString();
      const event: PlantingEvent = { ...copy(input), id: randomUUID(), photoUrl: null, createdAt: now, updatedAt: now };
      events.push(event);
      return { events, result: copy(event) };
    });
  }

  update(id: string, input: PlantingEventInput): Promise<PlantingEvent | null> {
    return this.write((events) => {
      const i = events.findIndex((e) => e.id === id);
      if (i < 0) return { events, result: null };
      const prev = events[i];
      const next: PlantingEvent = {
        ...copy(input),
        id: prev.id,
        photoUrl: prev.photoUrl,
        createdAt: prev.createdAt,
        // Guarantee updatedAt moves forward even if two saves land in the same millisecond.
        updatedAt: new Date(Math.max(Date.now(), Date.parse(prev.updatedAt) + 1)).toISOString(),
      };
      events[i] = next;
      return { events, result: copy(next) };
    });
  }

  delete(id: string): Promise<boolean> {
    return this.write((events) => {
      const kept = events.filter((e) => e.id !== id);
      return { events: kept, result: kept.length !== events.length };
    });
  }

  // ------------------------------------------------------------- file access

  /** All events from disk. A missing file means "no events yet", not an error. */
  private async read(): Promise<PlantingEvent[]> {
    let text: string;
    try {
      text = await readFile(this.file, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    const data = JSON.parse(text) as FileShape;
    if (data?.version !== 1 || !Array.isArray(data.events)) {
      throw new Error(`${this.file} is not a planting-events file (expected { "version": 1, "events": [...] }).`);
    }
    return data.events;
  }

  /**
   * Queue a read-modify-write. `change` gets the current events and returns
   * the new list plus the value to hand back to the caller.
   */
  private write<R>(change: (events: PlantingEvent[]) => { events: PlantingEvent[]; result: R }): Promise<R> {
    const run = async () => {
      const { events, result } = change(await this.read());
      const body: FileShape = { version: 1, events };
      await mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, JSON.stringify(body, null, 2) + "\n", "utf8");
      await rename(tmp, this.file);
      return result;
    };
    const next = this.queue.then(run, run); // run even if the previous write failed
    this.queue = next.catch(() => undefined); // a failed write must not block the queue
    return next;
  }
}
