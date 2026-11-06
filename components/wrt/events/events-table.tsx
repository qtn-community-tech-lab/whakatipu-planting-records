import Link from "next/link";
import type { EventView } from "@/lib/wrt/events/views";
import { formatHectares } from "@/lib/wrt/events/geo";
import { formatNumber } from "@/lib/wrt/text";
import { Card, EmptyState } from "@/components/wrt/shared/page";
import { DataTable, type DataTableColumn } from "@/components/wrt/shared/data-table";

/**
 * The /events list: one row per planting event, newest first, or an empty
 * state when nothing has been recorded. The page fetches the events
 * (eventViews) and passes them in.
 */
const COLUMNS: DataTableColumn<EventView>[] = [
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
];

export function EventsTable({ views }: { views: EventView[] }) {
  if (views.length === 0) {
    return (
      <EmptyState title="Nothing recorded yet">
        Use <Link href="/events/new" className="cn-link">New planting event</Link> to record a planting: choose the site, draw the area and list what went in.
      </EmptyState>
    );
  }
  return (
    <Card variant="table">
      <DataTable caption="Planting events, newest first" rows={views} rowKey={(v) => v.event.id} columns={COLUMNS} minWidth={720} />
    </Card>
  );
}
