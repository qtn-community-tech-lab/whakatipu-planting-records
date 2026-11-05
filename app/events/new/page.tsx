import type { Metadata } from "next";
import { connection } from "next/server";
import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { todayInNz } from "@/lib/wrt/events/season";
import { savedAreas } from "@/lib/wrt/events/views";
import { PageHead } from "@/components/wrt/shared/page";
import { EventForm } from "@/components/wrt/events/event-form";
import { PrototypeNotice } from "@/components/wrt/events/prototype-notice";

export const metadata: Metadata = {
  title: "New planting event",
  description: "Record a planting: the site, the planted area on the map, the date and season, and each species planted.",
};

export default async function NewEventPage() {
  await connection(); // "today" and the saved areas are per request
  const [options, areas] = await Promise.all([eventFormOptions(), savedAreas()]);
  return (
    <>
      <PageHead
        eyebrow="Planting events"
        title="New planting event"
        lead="Choose the site, draw the planted area on the map, then list each species and how many went in."
        back={{ href: "/events", label: "All planting events" }}
      />
      <PrototypeNotice />
      <EventForm options={options} event={null} today={todayInNz()} areas={areas} />
    </>
  );
}
