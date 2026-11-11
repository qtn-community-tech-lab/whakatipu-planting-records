import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/db/client", () => ({ db: mocks.db }));

import { createSpecies, updateSpecies } from "@/db/queries/species";
import { emptySpecies, speciesWriteValues } from "@/components/wrt/species/SpeciesForm";

it("preserves the existing slug even if an update caller supplies a different one", async () => {
  const update = vi.fn();
  const query = {
    update,
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { slug: "existing-species" }, error: null }),
  };
  update.mockReturnValue(query);
  mocks.db.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
  const values = speciesWriteValues({ ...emptySpecies, slug: "changed-slug", scientific_name: "Updated name" });

  await updateSpecies("existing-species", values);

  const { needs_decision, ...editable } = values;
  void needs_decision;
  expect(update).toHaveBeenCalledWith({ ...editable, slug: "existing-species" });
  expect(update.mock.calls[0]![0]).not.toHaveProperty("needs_decision");
  expect(query.eq).toHaveBeenCalledWith("slug", "existing-species");
});

it.each([true, false])("leaves the stored decision flag untouched when the caller submits %s", async (needs_decision) => {
  const query = {
    update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { slug: "existing-species" }, error: null }),
  };
  mocks.db.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
  await updateSpecies("existing-species", {
    ...speciesWriteValues({ ...emptySpecies, slug: "existing-species", scientific_name: "Updated name" }),
    needs_decision,
  });
  expect(query.update.mock.calls[0]![0]).not.toHaveProperty("needs_decision");
});

it("always creates species with the decision flag set to false", async () => {
  const query = {
    insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { slug: "new-species" }, error: null }),
  };
  mocks.db.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
  const values = { ...speciesWriteValues({ ...emptySpecies, slug: "new-species", scientific_name: "New species" }), needs_decision: true };
  await createSpecies(values);
  expect(query.insert).toHaveBeenCalledWith({ ...values, needs_decision: false });
});
