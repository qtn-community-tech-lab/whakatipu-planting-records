import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { todayInNz } from "@/lib/wrt/events/season";
import { getEventStore } from "@/lib/wrt/events/server";
import { eventViews, savedAreas } from "@/lib/wrt/events/views";
import { PageHead } from "@/components/wrt/shared/page";
import { EventForm } from "@/components/wrt/events/event-form";
import { DeleteEvent } from "@/components/wrt/events/delete-event";
import { PrototypeNotice } from "@/components/wrt/events/prototype-notice";

export const metadata: Metadata = { title: "Edit planting event" };

const UUID = /^[0-9a-f-]{36}$/;

export default async function EditEventPage({ params }: PageProps<"/events/[id]/edit">) {
  await connection();
  const { id } = await params;
  const event = UUID.test(id) ? await getEventStore().get(id) : null;
  if (!event) notFound();
  const [options, areas, [view]] = await Promise.all([eventFormOptions(), savedAreas(), eventViews([event])]);
  const label = `${view.dateLabel} at ${view.siteName}`;

  return (
    <>
      <PageHead
        eyebrow="Planting events"
        title={`Edit: ${label}`}
        back={{ href: "/events", label: "All planting events" }}
        aside={<DeleteEvent id={event.id} label={label} />}
      />
      <PrototypeNotice />
      <EventForm options={options} event={event} today={todayInNz()} areas={areas} />
    </>
  );
}
