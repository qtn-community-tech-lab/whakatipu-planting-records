import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getEventStore } from "@/lib/wrt/events/server";
import { eventViews } from "@/lib/wrt/events/views";
import { formatNumber } from "@/lib/wrt/text";
import { PageHead, Rule } from "@/components/wrt/shared/page";
import { PrototypeNotice } from "@/components/wrt/events/prototype-notice";
import { EventsTable } from "@/components/wrt/events/events-table";

export const metadata: Metadata = {
  title: "Planting events",
  description: "Planting events recorded in the app, each with its drawn area, date, season and species.",
};

const SAVED: Record<string, string> = {
  created: "Planting event recorded.",
  updated: "Changes saved.",
  deleted: "Planting event deleted.",
};

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  await connection(); // events change at runtime: never prerender this list
  const { saved } = await searchParams;
  const views = await eventViews(await getEventStore().list());
  const plants = views.reduce((s, v) => s + v.totalPlants, 0);
  const notice = typeof saved === "string" ? SAVED[saved] : undefined;

  return (
    <>
      <PageHead
        eyebrow="Planting events"
        title={views.length
          ? `${formatNumber(plants)} plants across ${formatNumber(views.length)} recorded ${views.length === 1 ? "event" : "events"}`
          : "No planting events recorded yet"}
        lead="New plantings recorded here, each with its drawn area. These are kept apart from the 2015–2026 history and its totals for now."
        aside={
          <>
            {views.length > 0 && (
              <a href="/events/export" className="cn-btn cn-btn--soft cn-btn--sm !no-underline" download>Export CSV</a>
            )}
            <Link href="/events/new" className="cn-btn cn-btn--primary cn-btn--sm !no-underline">New planting event</Link>
          </>
        }
      />
      <PrototypeNotice />
      {notice && <div className="cn-callout cn-callout--sm" role="status">{notice}</div>}

      <EventsTable views={views} />
      <Rule>Plants are what was entered on the form. Areas are calculated from the drawn shape.</Rule>
    </>
  );
}
