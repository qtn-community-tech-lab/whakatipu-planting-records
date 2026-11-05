/**
 * The EventStore contract (lib/wrt/events/event-store.ts) as a reusable suite.
 * Every store runs it: JsonEventStore now (tests/events-store.test.ts), and
 * SupabaseEventStore when it lands — call runEventStoreContract with a factory
 * that returns an empty store.
 */
import { describe, expect, it } from "vitest";
import type { EventStore } from "@/lib/wrt/events/event-store";
import type { PlantingEventInput } from "@/lib/wrt/events/types";

export function sampleInput(over: Partial<PlantingEventInput> = {}): PlantingEventInput {
  return {
    placeSlug: "lake-hayes",
    parcelId: null,
    plantedOn: "2026-05-10",
    season: "Autumn",
    seasonYear: 2026,
    polygon: { type: "Polygon", coordinates: [[[168.8, -44.98], [168.81, -44.98], [168.81, -44.99], [168.8, -44.98]]] },
    species: [{ speciesId: "SP-001", quantity: 40 }],
    notes: null,
    ...over,
  };
}

export function runEventStoreContract(name: string, makeStore: () => Promise<EventStore>) {
  describe(`EventStore contract: ${name}`, () => {
    it("starts empty", async () => {
      const store = await makeStore();
      expect(await store.list()).toEqual([]);
    });

    it("create assigns a UUID, timestamps and a null photo, and get returns it", async () => {
      const store = await makeStore();
      const e = await store.create(sampleInput());
      expect(e.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(e.photoUrl).toBeNull();
      expect(e.createdAt).toBe(e.updatedAt);
      expect(await store.get(e.id)).toEqual(e);
    });

    it("update keeps id and createdAt and moves updatedAt forward", async () => {
      const store = await makeStore();
      const e = await store.create(sampleInput());
      const u = await store.update(e.id, sampleInput({ notes: "second visit" }));
      expect(u?.id).toBe(e.id);
      expect(u?.createdAt).toBe(e.createdAt);
      expect(u!.updatedAt > e.updatedAt).toBe(true);
      expect((await store.get(e.id))?.notes).toBe("second visit");
    });

    it("unknown ids return null / false", async () => {
      const store = await makeStore();
      expect(await store.get("nope")).toBeNull();
      expect(await store.update("nope", sampleInput())).toBeNull();
      expect(await store.delete("nope")).toBe(false);
    });

    it("delete removes the event", async () => {
      const store = await makeStore();
      const e = await store.create(sampleInput());
      expect(await store.delete(e.id)).toBe(true);
      expect(await store.get(e.id)).toBeNull();
    });

    it("lists newest planting first and filters by place", async () => {
      const store = await makeStore();
      await store.create(sampleInput({ plantedOn: "2026-03-01" }));
      await store.create(sampleInput({ plantedOn: "2026-06-01", placeSlug: "jardine-park" }));
      await store.create(sampleInput({ plantedOn: "2026-04-01" }));
      expect((await store.list()).map((e) => e.plantedOn)).toEqual(["2026-06-01", "2026-04-01", "2026-03-01"]);
      expect((await store.listByPlace("lake-hayes")).map((e) => e.plantedOn)).toEqual(["2026-04-01", "2026-03-01"]);
    });

    it("concurrent creates are all kept", async () => {
      const store = await makeStore();
      await Promise.all(Array.from({ length: 10 }, (_, i) => store.create(sampleInput({ notes: `n${i}` }))));
      expect(await store.list()).toHaveLength(10);
    });

    it("returned objects are copies", async () => {
      const store = await makeStore();
      const e = await store.create(sampleInput());
      e.species[0].quantity = 999;
      expect((await store.get(e.id))?.species[0].quantity).toBe(40);
    });
  });
}
