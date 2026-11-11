import type { Metadata } from "next";
import { connection } from "next/server";
import { eventFormOptions } from "@/lib/wrt/events/form-options";
import { todayInNz } from "@/lib/wrt/events/season";
import { PageHead } from "@/components/wrt/shared/page";
import { EventForm } from "@/components/wrt/events/event-form";
import { PrototypeNotice } from "@/components/wrt/events/prototype-notice";
import { isAuthenticated } from "@/db/queries/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "New planting event",
  description: "Record a planting: the site, the date and season, and each species planted.",
};

export default async function NewEventPage() {
  if (!(await isAuthenticated())) redirect("/login?next=%2Fevents%2Fnew");
  await connection(); // "today" is per request
  const options = await eventFormOptions();
  return (
    <>
      <PageHead
        eyebrow="Planting events"
        title="New planting event"
        lead="Choose the site and the date, then list each species and how many went in."
      />
      <PrototypeNotice />
      <EventForm options={options} today={todayInNz()} />
    </>
  );
}
