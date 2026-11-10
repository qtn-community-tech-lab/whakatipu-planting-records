import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/db/client", () => ({ db: mocks.db }));

import { updateSpecies } from "@/db/queries/species";
import { emptySpecies, speciesWriteValues } from "@/components/wrt/species/SpeciesForm";

it("preserves the existing slug even if an update caller supplies a different one", async () => {
  const update = vi.fn();
  const query = {
    update,
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { slug: "existing-species" }, error: null }),
  };
  update.mockReturnValue(query);
  mocks.db.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
  const values = speciesWriteValues({ ...emptySpecies, slug: "changed-slug", scientific_name: "Updated name" });

  await updateSpecies("existing-species", values);

  expect(update).toHaveBeenCalledWith({ ...values, slug: "existing-species" });
  expect(query.eq).toHaveBeenCalledWith("slug", "existing-species");
});
