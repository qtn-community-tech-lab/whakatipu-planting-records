import { describe, expect, it } from "vitest";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { describeEvent, WHOLE_SITE } from "@/lib/wrt/events/summary";
import type { PlantingEventInput } from "@/lib/wrt/events/types";

const options: EventFormOptions = {
  sites: [{ slug: "lake-hayes", name: "Lake Hayes", keys: [], parts: [{ id: "9A", name: "Lake Hayes Pavilion", keys: [] }] }],
  species: [{ id: "SP-1", name: "Kōwhai", scientific: "Sophora microphylla", isScientific: false, keys: [] }],
};

const input: PlantingEventInput = {
  siteSlug: "lake-hayes",
  partId: null,
  plantedOn: "2026-10-07",
  season: "Spring",
  seasonYear: 2026,
  polygon: null,
  species: [{ speciesId: "SP-1", quantity: 120 }, { speciesId: "SP-2", quantity: 30 }],
  notes: null,
};

describe("describeEvent", () => {
  it("describes an event in names, with the site as a whole when no part is chosen", () => {
    const s = describeEvent(input, options);
    expect(s).toMatchObject({ site: "Lake Hayes", part: WHOLE_SITE, date: "Wed 7 Oct 2026", season: "Spring 2026", total: 150 });
    expect(s.species[0]).toEqual({ name: "Kōwhai", quantity: 120 });
  });

  it("never shows a raw id", () => {
    const s = describeEvent({ ...input, siteSlug: "nowhere", partId: "9Z" }, options);
    const text = JSON.stringify(s);
    for (const id of ["nowhere", "9Z", "SP-2"]) expect(text).not.toContain(id);
  });
});
