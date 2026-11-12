import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

const root = path.resolve(import.meta.dirname, "..");

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string) {
  const bytes = readFileSync(file);
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

describe("web app manifest", () => {
  const m = manifest();

  it("is installable: standalone, with 192px and 512px icons and a maskable icon", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    const sizes = m.icons?.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(m.icons?.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("points every icon at a PNG of the stated size", () => {
    for (const icon of m.icons ?? []) {
      const file = path.join(root, "public", icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      expect(pngSize(file), icon.src).toBe(icon.sizes);
    }
  });

  it("offers shortcuts to pages that exist", () => {
    expect(m.shortcuts?.map((s) => s.url)).toContain("/events/new");
    for (const shortcut of m.shortcuts ?? []) {
      expect(existsSync(path.join(root, "app", shortcut.url, "page.tsx")), shortcut.url).toBe(true);
    }
  });

});

describe("service worker", () => {
  const source = readFileSync(path.join(root, "public", "sw.js"), "utf8");

  /** Runs sw.js with a stub `self` and returns its fetch handler and what it precached. */
  function loadWorker(network: (request: { url: string; mode: string; method: string }) => Promise<string>) {
    const handlers: Record<string, (event: unknown) => void> = {};
    const cached = new Map([["/offline.html", "offline page"]]);
    const self = { addEventListener: (type: string, fn: (event: unknown) => void) => { handlers[type] = fn; } };
    const caches = { match: async (key: string | { url: string }) => cached.get(typeof key === "string" ? key : new URL(key.url).pathname) };
    runInNewContext(source, { self, caches, fetch: network, URL, Request });
    const onFetch = handlers.fetch;
    if (!onFetch) throw new Error("sw.js registered no fetch handler");
    return (request: { url: string; mode: string; method: string }) => {
      let response: Promise<unknown> | undefined;
      onFetch({ request, respondWith: (r: Promise<unknown>) => { response = r; } });
      return response;
    };
  }
  const page = { url: "http://localhost/sites", mode: "navigate", method: "GET" };

  it("loads pages from the network while online", async () => {
    const handle = loadWorker(async () => "live page");
    await expect(handle(page)).resolves.toBe("live page");
  });

  it("shows the offline page when a page can't load", async () => {
    const handle = loadWorker(async () => { throw new TypeError("Failed to fetch"); });
    await expect(handle(page)).resolves.toBe("offline page");
  });

  it("leaves data requests and server actions to the network", () => {
    const handle = loadWorker(async () => "network");
    expect(handle({ url: "http://localhost/sites?_rsc=1", mode: "cors", method: "GET" })).toBeUndefined();
    expect(handle({ url: "http://localhost/species/new", mode: "cors", method: "POST" })).toBeUndefined();
  });

  it("names its cache after the offline files, so changing them updates installed apps", () => {
    const hash = createHash("sha256")
      .update(readFileSync(path.join(root, "public", "offline.html")))
      .update(readFileSync(path.join(root, "public", "icons", "icon-192.png")))
      .digest("hex").slice(0, 8);
    expect(source).toContain(`const VERSION = "${hash}";`);
  });
});
