import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixture, record } from "./explorer-fixture";
import { createQueries } from "@/lib/wrt/queries";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/wrt/server", () => ({ getWrt: () => createQueries(async () => data) }));
import { tools } from "@/lib/wrt/chat-tools";

let data = fixture();
const context = { toolCallId: "test", messages: [] };
beforeEach(() => { data = fixture(); });

describe("database-backed chat tools", () => {
  it("opens saved species profiles without requiring planting history", async () => {
    const output = await tools.species.execute!({ name: "manuka" }, context);
    expect(output).toMatchObject({ found: true, species: { description: "Saved description", imageUrl: "https://example.invalid/photo.jpg" }, split: { total: 0, records: 0, unknown: 0 }, span: null });
  });
  it("uses the same exact-label totals and unknown counts as the pages", async () => {
    data.records = [record({ seasonName: "winter", seasonSlug: "winter", quantity: null }), record({ id: "known", seasonName: "winter", seasonSlug: "winter", quantity: 4 }), record({ id: "other" })];
    const output = await tools.records.execute!({ place: "reserve", season: "winter", groupBy: "species" }, context);
    expect(output).toMatchObject({ split: { total: 4, records: 2, unknown: 1 }, groupCount: 1 });
  });
  it("does not broaden an unknown requested area to its entire parent site", async () => {
    data.records = [record()];
    const output = await tools.records.execute!({ place: "reserve", part: "missing", groupBy: "species" }, context);
    expect(output).toMatchObject({ split: { total: 0, records: 0, unknown: 0 } });
  });
});
