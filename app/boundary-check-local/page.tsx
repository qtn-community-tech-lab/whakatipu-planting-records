"use client";

import { useState } from "react";
import { CreatePlantingEvent } from "@/components/wrt/create-planting-event/create-planting-event";
import { boundaryFromCorners } from "@/lib/wrt/areas/geometry";
import type { PlantingAreaPin } from "@/lib/wrt/site-locations";

const site = { slug: "reserve", name: "Reserve", keys: [], parts: [
  { id: "1A", name: "East bank", keys: [] }, { id: "west", name: "West bank", keys: [] },
] };
const options = { sites: [site], species: [
  { id: "kowhai", scientific: "Sophora microphylla", name: "Kōwhai", isScientific: false, keys: [] },
] };
const east = { site: site.slug, slug: "east", name: "East bank", description: "", wrt_number: "1A",
  lng: null, lat: null, pin_source_url: null, pin_checked_on: null,
  boundary: boundaryFromCorners([[168.69, -44.996], [168.694, -44.996], [168.694, -44.993]]) };
export default function BoundaryCheck() {
  const [areas, setAreas] = useState<PlantingAreaPin[]>([east, { ...east, slug: "west", name: "West bank", wrt_number: null, boundary: null }]);
  return <CreatePlantingEvent recording initialSite="reserve" initialPart="1A" exitHref="/records"
    options={options} totals={{}} suggestions={{}} areas={areas} today="2026-11-26"
    onSave={async () => ({})} onSaveBoundary={async (input) => {
      if (sessionStorage.getItem("fail-once")) {
        sessionStorage.removeItem("fail-once");
        return { error: "The boundary could not be saved. Your drawing is still here. Please try again." };
      }
      document.body.dataset.boundaryResult = JSON.stringify(input);
      setAreas(areas.map((area) => area.slug === input.area ? { ...area, boundary: input.boundary } : area));
      return {};
    }}
  />;
}
