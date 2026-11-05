import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JsonEventStore } from "@/lib/wrt/events/json-event-store";
import { runEventStoreContract, sampleInput } from "./event-store-contract";

const freshFile = async () => path.join(await mkdtemp(path.join(tmpdir(), "wrt-events-")), "nested", "events.json");

runEventStoreContract("JsonEventStore", async () => new JsonEventStore(await freshFile()));

describe("JsonEventStore file", () => {
  it("writes a versioned file, creating folders as needed", async () => {
    const file = await freshFile();
    await new JsonEventStore(file).create(sampleInput());
    const data = JSON.parse(await readFile(file, "utf8"));
    expect(data.version).toBe(1);
    expect(data.events).toHaveLength(1);
  });

  it("a second store on the same file sees the saved events", async () => {
    const file = await freshFile();
    const e = await new JsonEventStore(file).create(sampleInput());
    expect(await new JsonEventStore(file).get(e.id)).toEqual(e);
  });
});
