import type { Metadata } from "next";
import { Calendar, Map as MapIcon, MapPin, Sprout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHead } from "@/components/wrt/shared/page";
import { requireAuthenticated } from "@/db/queries/auth";
import { countExportRows } from "@/db/queries/export";
import { exportName } from "@/lib/wrt/export/csv";
import { EXPORT_FILES, type ExportFile } from "@/lib/wrt/export/files";
import { formatNumber } from "@/lib/wrt/text";

export const metadata: Metadata = { title: "Export data" };

const GROUPS: readonly ExportFile["group"][] = ["Plantings", "Places and species"];

/** How the files link, in the order a planting is recorded. */
const STEPS = [
  { icon: MapPin, title: "A site", text: "A place WRT plants, like a reserve or a scheme.", file: "sites.csv" },
  { icon: MapIcon, title: "Has areas", text: "Parts of the site, each with a pin on the map.", file: "areas.csv" },
  { icon: Calendar, title: "Planted in a season", text: "Each time an area was planted, e.g. Autumn 2019.", file: "planting_events.csv" },
  { icon: Sprout, title: "With these plants", text: "Which species went in, and how many of each.", file: "planting_lines.csv" },
];

export default async function ExportPage() {
  await requireAuthenticated("/export");
  const rows = await Promise.all(EXPORT_FILES.map(async (file) => ({ file, count: await countExportRows(file.name) })));

  return (
    <>
      <PageHead
        eyebrow="Export data"
        title="Export planting data"
        lead="Everything stored in the register as six CSV files that open in Excel or Numbers: workbook history, app entries and deactivated rows."
        aside={
          <Button asChild>
            <a href="/export/all" download>Download all data (.zip)</a>
          </Button>
        }
      />

      <p className="cn-callout cn-callout--note cn-callout--sm m-0" role="note">
        <span>
          <b>A blank quantity means unknown</b>, not zero. It was “TBC” in the workbook. 0 appears only where 0 was
          recorded.
        </span>
      </p>

      <Card
        title="Files"
        variant="table"
        action={
          <span className="text-[var(--text-muted)] [font:var(--type-meta)]">
            File names carry today’s date, e.g. {exportName("planting_lines")}.csv
          </span>
        }
      >
        {/* One table with group rows, so the columns line up across groups (DataTable has no group rows). */}
        <div className="wrt-table-wrap">
          <table className="wrt-table wrt-data-table [&_td]:!px-3 [&_td]:!py-3.5" style={{ minWidth: 620 }}>
            <caption className="sr-only">Export files</caption>
            <thead>
              <tr>
                <th scope="col">File</th>
                <th scope="col">One row per</th>
                <th scope="col" className="cn-num">Rows</th>
                <th scope="col"><span className="sr-only">Download</span></th>
              </tr>
            </thead>
            {GROUPS.map((group) => (
              <tbody key={group}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={4}
                    className="!bg-[var(--surface-app)] !px-3 !py-1.5 text-[var(--text-muted)] ![font:var(--type-label)]"
                  >
                    {group}
                  </th>
                </tr>
                {rows.filter(({ file }) => file.group === group).map(({ file, count }) => (
                  <tr key={file.name} className="text-[var(--text-body)] [font:var(--type-body)]">
                    <td>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <code className="[font:var(--type-annotation)]">{file.name}.csv</code>
                        {file.startHere && (
                          <Badge tone="ok" className="!px-2 !py-0.5 ![font:var(--type-label)]">Start here</Badge>
                        )}
                      </span>
                    </td>
                    <td className="first-letter:uppercase">{file.rowPer}</td>
                    <td className="cn-num">{formatNumber(count)}</td>
                    <td className="whitespace-nowrap">
                      <a
                        className="cn-link !text-[var(--link)] !underline underline-offset-2 hover:!text-[var(--link-hover)]"
                        href={`/export/${file.name}.csv`}
                        download
                      >
                        Download CSV<span className="sr-only">: {file.label}</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Card>

      <Card title="How the files fit together">
        <ol className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {STEPS.map((step, i) => (
            <li key={step.file} className="flex flex-col gap-1.5 rounded-lg bg-muted p-4">
              <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <step.icon className="size-5" aria-hidden="true" />
              </span>
              <strong>{i + 1}. {step.title}</strong>
              <span className="text-sm text-muted-foreground">{step.text}</span>
              <code className="text-xs">{step.file}</code>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Good to know before you start">
        <div className="wrt-prose flex flex-col gap-3">
          <p className="m-0">
            <b>Some rows are no longer in use.</b> We keep them so nothing is lost. They have a date in the
            “deactivated_at” column. To see today’s picture, filter out any row where that column has a date.
          </p>
          <p className="m-0">
            <b>Old records and new ones are both here.</b> The “source” column in planting events tells you whether a
            planting came from the original workbook or was entered in this app.
          </p>
          <p className="m-0">
            <b>Your totals will match the app.</b> Add up the “quantity” column in planting lines, leaving out any line
            with a date in “deactivated_at” or “event_deactivated_at”. You’ll get the same numbers the app shows.
          </p>
          <p className="m-0">
            <b>Opens cleanly in Excel or Numbers.</b> Names keep their macrons, and nothing in the file can run as
            a formula.
          </p>
        </div>
      </Card>
    </>
  );
}
