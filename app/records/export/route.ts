import type { NextRequest } from "next/server";
import { getWrt } from "@/lib/wrt/server";
import { csvFilename, recordsToCsv } from "@/lib/wrt/records-csv";
import { parseRecordParams } from "@/components/wrt/explore/filters";

/**
 * GET /records/export?place=…&year=… — the same filter as /records, as CSV.
 * Unrecognised filter values return 400 rather than exporting everything. Opens cleanly in Excel (UTF-8 with BOM, so macrons survive).
 */
export async function GET(request: NextRequest) {
  const wrt = getWrt();
  const lookups = await wrt.lookups();
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const { filter, ignored } = parseRecordParams(raw, lookups);
  if (ignored.length) {
    // A mistyped filter must not quietly export the whole dataset.
    return new Response(
      `Not exported: these filters were not recognised: ${ignored.map((i) => `${i.param} "${i.value}"`).join(", ")}.\n`,
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
  const { rows } = await wrt.records(filter);


  const name = csvFilename(filter);
  return new Response(recordsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
