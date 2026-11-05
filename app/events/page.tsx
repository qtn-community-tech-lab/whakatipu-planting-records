import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getEventStore } from "@/lib/wrt/events/server";
import { formatHectares } from "@/lib/wrt/events/geo";
import { eventViews } from "@/lib/wrt/events/views";
import { formatNumber } from "@/lib/wrt/text";
import { Card, EmptyState, PageHead, Rule } from "@/components/wrt/shared/page";
import { DataTable } from "@/components/wrt/shared/data-table";
import { PrototypeNotice } from "@/components/wrt/events/prototype-notice";

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

      {views.length === 0 ? (
        <EmptyState title="Nothing recorded yet">
          Use <Link href="/events/new" className="cn-link">New planting event</Link> to record a planting: choose the site, draw the area and list what went in.
        </EmptyState>
      ) : (
        <Card variant="table">
          <DataTable
            caption="Planting events, newest first"
            rows={views}
            rowKey={(v) => v.event.id}
            minWidth={720}
            columns={[
              { key: "date", header: "Date", cell: (v) => v.dateLabel, nowrap: true },
              {
                key: "site", header: "Site",
                cell: (v) => (
                  <>
                    <Link href={`/sites/${v.event.placeSlug}`} className="cn-link">{v.siteName}</Link>
                    {v.partName && <span className="wrt-muted block">{v.partName}</span>}
                  </>
                ),
              },
              { key: "season", header: "Season", cell: (v) => v.seasonLabel, nowrap: true },
              {
                key: "species", header: "Species",
                cell: (v) => (v.species.length === 1 ? v.species[0].name : `${v.species[0].name} + ${v.species.length - 1} more`),
              },
              { key: "plants", header: "Plants", cell: (v) => formatNumber(v.totalPlants), numeric: true, strong: true },
              { key: "area", header: "Area", cell: (v) => formatHectares(v.areaM2), numeric: true },
              {
                key: "edit", header: "Actions", hideHeader: true, className: "text-right",
                cell: (v) => (
                  <Link href={`/events/${v.event.id}/edit`} className="cn-link">
                    Edit<span className="sr-only"> {v.dateLabel} at {v.siteName}</span>
                  </Link>
                ),
              },
            ]}
          />
        </Card>
      )}
      <Rule>Plants are what was entered on the form. Areas are calculated from the drawn shape.</Rule>
    </>
  );
}
