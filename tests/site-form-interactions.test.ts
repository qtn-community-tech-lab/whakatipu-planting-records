import { createElement, type ComponentProps, type ChangeEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type * as HookForm from "react-hook-form";
import type * as ButtonModule from "@/components/ui/button";
import { createPlantingAreaSchema, type PlantingAreaFormValues } from "@/db/types";
import { INPUT_LIMITS } from "@/lib/forms/limits";

const captured = vi.hoisted(() => ({
  defaults: undefined as { slug: string; name: string; description: string; areas: PlantingAreaFormValues[] } | undefined,
  inputs: new Map<string, ComponentProps<"input">>(),
  form: undefined as Pick<HookForm.UseFormReturn, "setValue"> | undefined,
  append: vi.fn(),
  addArea: undefined as (() => void) | undefined,
  resolver: undefined as HookForm.UseFormProps<HookForm.FieldValues, unknown, unknown>["resolver"],
}));
vi.mock("react-hook-form", async (importOriginal) => {
  const actual = await importOriginal<typeof HookForm>();
  return { ...actual, useForm: (...args: Parameters<typeof actual.useForm>) => {
    captured.resolver = args[0]?.resolver;
    const form = actual.useForm(captured.defaults ? { ...args[0], defaultValues: captured.defaults } : args[0]);
    vi.spyOn(form, "setValue");
    captured.form = form;
    return form;
  }, useFieldArray: (...args: Parameters<typeof actual.useFieldArray>) => ({
    ...actual.useFieldArray(...args), append: captured.append,
  }) };
});
vi.mock("@/components/ui/button", async (importOriginal) => {
  const actual = await importOriginal<typeof ButtonModule>();
  return { ...actual, Button: (props: ComponentProps<typeof actual.Button>) => {
    if (props.children === "Add area" && props.onClick) {
      const onClick = props.onClick;
      captured.addArea = () => onClick({} as Parameters<typeof onClick>[0]);
    }
    return createElement(actual.Button, props);
  } };
});
vi.mock("@/components/ui/input", () => ({ Input: (props: ComponentProps<"input">) => {
  if (props.name) captured.inputs.set(props.name, props);
  return createElement("input", props);
} }));

import { SiteForm } from "@/components/wrt/sites/SiteForm";

beforeEach(() => { captured.defaults = undefined; captured.addArea = undefined; captured.inputs.clear(); vi.clearAllMocks(); });

function renderCreate() {
  return renderToStaticMarkup(createElement(SiteForm, {
    onSubmit: async () => ({}), submitLabel: "Create site", cancelHref: "/sites",
  }));
}
function change(name: string, value: string) {
  captured.inputs.get(name)!.onChange!({ target: { name, value } } as ChangeEvent<HTMLInputElement>);
}

it("generates the web address from the site name until staff edit it", () => {
  const html = renderCreate();
  expect(html).toContain("Web address name");
  expect(html.indexOf('name="name"')).toBeLessThan(html.indexOf('name="slug"'));
  change("name", "Lake Hayes");
  expect(captured.form!.setValue).toHaveBeenLastCalledWith("slug", "lake-hayes", { shouldValidate: false });
  change("name", "Māori & River Reserve");
  expect(captured.form!.setValue).toHaveBeenLastCalledWith("slug", "maori-river-reserve", { shouldValidate: false });
  change("slug", "my-own-address");
  vi.mocked(captured.form!.setValue).mockClear();
  change("name", "Changed site name");
  expect(captured.form!.setValue).not.toHaveBeenCalled();
});

it("keeps an existing site's web address fixed when its name changes", () => {
  const html = renderToStaticMarkup(createElement(SiteForm, {
    values: { slug: "river-reserve", name: "River Reserve", description: "", updated_at: "now" },
    areas: [], onSubmit: async () => ({}), submitLabel: "Save", cancelHref: "/sites",
  }));
  expect(html).toMatch(/<input[^>]*id="slug"[^>]*readOnly=""/);
  change("name", "Corrected name");
  expect(captured.form!.setValue).not.toHaveBeenCalled();
});


function withNewAreas(...names: string[]) {
  captured.defaults = {
    slug: "lake-hayes", name: "Lake Hayes", description: "",
    areas: names.map((name) => ({ name, slug: "", description: "", existing: false })),
  };
}

it("requires an area in the shared site form before submitting", async () => {
  expect(renderCreate()).toContain("Add at least one area.");
  const result = await captured.resolver!({ name: "Lake Hayes", slug: "lake-hayes", description: "", areas: [] }, undefined, {
    fields: {}, shouldUseNativeValidation: false,
  });
  expect(result.errors).toMatchObject({ areas: { message: "Add at least one area." } });
});

it("prefills the first area of a new site with its name and custom web address", () => {
  withNewAreas();
  captured.defaults!.slug = "custom-site";
  renderCreate();
  captured.addArea!();
  expect(captured.append).toHaveBeenCalledWith({
    name: "Lake Hayes", slug: "custom-site", description: "", pin: null, boundary: null, existing: false,
  });
});

it("starts additional areas blank and keeps the matching area's address in sync", () => {
  withNewAreas("Lake Hayes");
  renderCreate();
  captured.addArea!();
  expect(captured.append).toHaveBeenCalledWith(expect.objectContaining({ name: "", slug: "" }));
  change("slug", "custom-site");
  expect(captured.form!.setValue).toHaveBeenLastCalledWith("areas.0.slug", "custom-site", { shouldValidate: false });
});

it("shows each area's map below its own fields by default", () => {
  withNewAreas("East bank", "West bank");
  const html = renderCreate();
  expect(html).not.toContain("Area to edit on the map");
  expect(html).not.toContain("Edit on map");
  for (const index of [0, 1]) {
    const description = html.indexOf(`name="areas.${index}.description"`);
    const panel = html.indexOf(`id="area-map-${index}"`);
    expect(description).toBeGreaterThanOrEqual(0);
    expect(panel).toBeGreaterThan(description);
    expect(html).not.toContain(`id="area-map-${index}" hidden=""`);
  }
});

it("generates area addresses from the site address and area name", () => {
  withNewAreas("");
  const html = renderCreate();
  expect(html.indexOf('name="areas.0.name"')).toBeLessThan(html.indexOf('name="areas.0.slug"'));
  expect(html).toContain("Area web address name");
  change("areas.0.name", "Māori & East Bank");
  expect(captured.form!.setValue).toHaveBeenLastCalledWith("areas.0.slug", "lake-hayes-maori-east-bank", { shouldValidate: false });
  change("areas.0.name", "");
  expect(captured.form!.setValue).toHaveBeenLastCalledWith("areas.0.slug", "", { shouldValidate: false });
});

it("updates generated area prefixes when the unsaved site name or address changes", () => {
  withNewAreas("East bank");
  renderCreate();
  change("name", "River Reserve");
  expect(captured.form!.setValue).toHaveBeenLastCalledWith("areas.0.slug", "river-reserve-east-bank", { shouldValidate: false });
  change("slug", "custom-site");
  expect(captured.form!.setValue).toHaveBeenLastCalledWith("areas.0.slug", "custom-site-east-bank", { shouldValidate: false });
});

it("preserves a manually edited area address while updating other areas", () => {
  withNewAreas("East bank", "West bank");
  renderCreate();
  change("areas.0.slug", "custom-east");
  change("areas.0.name", "Renamed east bank");
  expect(captured.form!.setValue).not.toHaveBeenCalled();
  change("slug", "river-reserve");
  expect(captured.form!.setValue).toHaveBeenCalledTimes(1);
  expect(captured.form!.setValue).toHaveBeenLastCalledWith("areas.1.slug", "river-reserve-west-bank", { shouldValidate: false });
});

it("keeps saved area addresses fixed and prefixes new areas with the existing site's address", () => {
  withNewAreas("Saved east", "New west");
  captured.defaults!.areas[0] = { name: "Saved east", slug: "old-east", description: "", existing: true };
  renderToStaticMarkup(createElement(SiteForm, {
    values: { slug: "fixed-site", name: "Lake Hayes", description: "", updated_at: "now" },
    areas: [], onSubmit: async () => ({}), submitLabel: "Save", cancelHref: "/sites",
  }));
  expect(captured.inputs.get("areas.0.slug")!.readOnly).toBe(true);
  change("areas.0.name", "Renamed east");
  expect(captured.form!.setValue).not.toHaveBeenCalled();
  change("areas.1.name", "New west");
  expect(captured.form!.setValue).toHaveBeenLastCalledWith("areas.1.slug", "fixed-site-new-west", { shouldValidate: false });
});

it("validates the full generated area address without truncating it", () => {
  withNewAreas("");
  renderCreate();
  for (const extra of [0, 1]) {
    const name = "a".repeat(INPUT_LIMITS.identifier - "lake-hayes-".length + extra);
    change("areas.0.name", name);
    const generated = `lake-hayes-${name}`;
    expect(captured.form!.setValue).toHaveBeenLastCalledWith("areas.0.slug", generated, { shouldValidate: false });
    expect(createPlantingAreaSchema.safeParse({ slug: generated, name, description: "" }).success).toBe(extra === 0);
  }
});
