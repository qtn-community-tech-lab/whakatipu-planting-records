import { createElement, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpeciesName, SpeciesPicker } from "@/components/wrt/create-planting-event/form/species-picker";
import { WhatPlanted } from "@/components/wrt/create-planting-event/form/what-planted";
import { useEventForm } from "@/components/wrt/create-planting-event/form/use-event-form";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import type { SpeciesSuggestion } from "@/lib/wrt/events/site-suggestions";

const species = { id: "SP-1", name: "Kōwhai", scientific: "Sophora microphylla", isScientific: false, keys: ["sophora microphylla", "kowhai"] };
const options: EventFormOptions = { sites: [], species: [species] };
const suggestion: SpeciesSuggestion = {
  speciesId: species.id, scientific: species.scientific, common: "Small-leaved kōwhai", maori: "Kōwhai", here: 35, photo: null,
};

describe("scientific names in planting forms", () => {
  it("shows scientific names first in the picker, with the supporting name once", () => {
    const html = renderToStaticMarkup(createElement(SpeciesName, { s: species }));
    expect(html.indexOf("Sophora microphylla")).toBeLessThan(html.indexOf("Kōwhai"));
    const scientificOnly = renderToStaticMarkup(createElement(SpeciesName, {
      s: { ...species, name: species.scientific, isScientific: true },
    }));
    expect(scientificOnly.match(/Sophora microphylla/g)).toHaveLength(1);
  });

  it("keeps the scientific name in the field after a species is selected", () => {
    const html = renderToStaticMarkup(createElement(SpeciesPicker, {
      label: "Add species", species: [species], value: species.id, taken: new Set<string>(), onChange: () => {},
    }));
    expect(html).toContain('value="Sophora microphylla"');
  });

  it.each([{ suggestions: [] }, { suggestions: [suggestion] }])("uses the scientific name for quantity entry, with and without site history: $suggestions.length", ({ suggestions }) => {
    function PlantingList() {
      const form = useEventForm({
        options, today: "2026-11-23", formRef: useRef<HTMLFormElement>(null), headingRef: useRef<HTMLHeadingElement>(null),
      });
      return createElement(WhatPlanted, {
        form: { ...form, lines: [{ speciesId: species.id, quantity: "12" }] }, options, suggestions, areas: [],
      });
    }
    const html = renderToStaticMarkup(createElement(PlantingList));
    expect(html).toContain('<i>Sophora microphylla</i>');
    expect(html).toContain('aria-label="Sophora microphylla: how many planted"');
    expect(html).toContain('value="12"');
    expect(html).toContain("Kōwhai");
    if (suggestions.length) {
      expect(html).toContain("Small-leaved kōwhai");
      expect(html).toContain("35 planted here before");
    }
  });
});
