import type { Metadata } from "next";
import { Card, EmptyState, PageHead, Rule } from "@/components/wrt/shared/page";
import { DataTable, type DataTableColumn } from "@/components/wrt/shared/data-table";
import { formatNumber } from "@/lib/wrt/text";

/**
 * /playground/table — demo of the shared DataTable, for checking it on
 * phones and desktop. Not linked from the nav. Uses made-up sample rows, not
 * WRT data, so the page always shows the same cases.
 */
export const metadata: Metadata = {
  title: "Table playground",
  robots: { index: false, follow: false },
};

interface SampleEvent {
  id: string;
  date: string;
  site: string;
  part: string | null;
  season: string;
  species: string;
  plants: number;
  area: string;
  review?: boolean;
}

const EVENTS: SampleEvent[] = [
  { id: "a", date: "Wed 7 Oct 2026", site: "Lake Hayes", part: "Lake Hayes Pavilion", season: "Spring 2026", species: "Mānuka + 4 more", plants: 1240, area: "0.42 ha" },
  { id: "b", date: "Sat 3 Oct 2026", site: "Jardine Park", part: null, season: "Spring 2026", species: "Kōwhai", plants: 60, area: "0.05 ha", review: true },
  { id: "c", date: "Thu 14 May 2026", site: "Arrowtown – Feehly Hill reserve, lower terraces", part: "Western gully below the walking track", season: "Autumn 2026", species: "Pittosporum tenuifolium + 11 more", plants: 3075, area: "1.84 ha" },
  { id: "d", date: "Mon 2 Feb 2026", site: "Frankton", part: null, season: "Summer 2026", species: "Harakeke", plants: 8, area: "0.01 ha" },
];

const EVENT_COLUMNS: DataTableColumn<SampleEvent>[] = [
  { key: "date", header: "Date", cell: (r) => r.date, nowrap: true },
  { key: "site", header: "Site", cell: (r) => <>{r.site}{r.part && <span className="wrt-muted block">{r.part}</span>}</> },
  { key: "season", header: "Season", cell: (r) => r.season, nowrap: true },
  { key: "species", header: "Species", cell: (r) => r.species },
  { key: "plants", header: "Plants", cell: (r) => formatNumber(r.plants), numeric: true, strong: true },
  { key: "area", header: "Area", cell: (r) => r.area, numeric: true },
  {
    key: "edit", header: "Actions", hideHeader: true, className: "text-right",
    // The hidden text here is what used to widen the whole page on mobile (see .wrt-table-wrap in styles/app.css).
    cell: (r) => <a href="#" className="cn-link">Edit<span className="sr-only"> {r.date} at {r.site}</span></a>,
  },
];

const SEASONS = [
  { id: "s", season: "Spring", months: "Sep–Nov" },
  { id: "u", season: "Summer", months: "Dec–Feb" },
  { id: "a", season: "Autumn", months: "Mar–May" },
  { id: "w", season: "Winter", months: "Jun–Aug" },
];

export default function TablePlayground() {
  return (
    <>
      <PageHead
        eyebrow="Playground"
        title="Shared table"
        lead={<>The app&rsquo;s <code className="cn-code">DataTable</code> component (<code className="cn-code">components/wrt/shared/data-table.tsx</code>). Open this page on a phone, or narrow the window: wide tables scroll sideways inside their card, the page itself never scrolls sideways, and the columns stay lined up.</>}
      />

      <Card title="Wide table: scrolls sideways below 720 px" variant="table">
        <DataTable
          caption="Sample planting events"
          rows={EVENTS}
          rowKey={(r) => r.id}
          columns={EVENT_COLUMNS}
          minWidth={720}
          rowClassName={(r) => (r.review ? "is-review" : undefined)}
        />
      </Card>
      <Rule>Long site and species names wrap within their column; dates, seasons and numbers never wrap. The second row shows the review marker other tables use.</Rule>

      <Card title="Narrow table: fits on a phone, no scrolling" variant="table">
        <DataTable caption="Seasons by month" rows={SEASONS} rowKey={(r) => r.id} minWidth={280} columns={[
          { key: "season", header: "Season", cell: (r) => r.season, strong: true },
          { key: "months", header: "Months", cell: (r) => r.months, nowrap: true },
        ]} />
      </Card>

      <Card title="No rows" variant="table">
        <DataTable
          caption="Empty table"
          rows={[] as SampleEvent[]}
          rowKey={(r) => r.id}
          columns={EVENT_COLUMNS}
          empty={<EmptyState title="Nothing recorded yet">Pass <code className="cn-code">empty</code> to show this instead of an empty table.</EmptyState>}
        />
      </Card>
    </>
  );
}
