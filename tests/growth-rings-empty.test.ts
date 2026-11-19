import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));

import { GrowthRings } from "@/components/wrt/shell/growth-rings";

it("labels an empty history without undefined season names", () => {
  const html = renderToStaticMarkup(createElement(GrowthRings, { seasons: [] }));
  expect(html).toContain("No planting history yet");
  expect(html).toContain('aria-label="No planting seasons recorded"');
  expect(html).not.toContain("undefined");
});
