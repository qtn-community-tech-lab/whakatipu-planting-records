import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { JsonEventStore } from "@/lib/wrt/events/json-event-store";
import { runEventStoreContract } from "./event-store-contract";

const freshFile = async () => path.join(await mkdtemp(path.join(tmpdir(), "wrt-events-")), "nested", "events.json");

runEventStoreContract("JsonEventStore", async () => new JsonEventStore(await freshFile()));

