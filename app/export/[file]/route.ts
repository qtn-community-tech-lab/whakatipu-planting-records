import type { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { requireAuthenticated } from "@/db/queries/auth";
import { exportName } from "@/lib/wrt/export/csv";
import { findExportFile } from "@/lib/wrt/export/files";

/** GET /export/<table>.csv: one file of the staff data export. Signed-out visitors go to sign-in. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/export/[file]">) {
  await requireAuthenticated("/export");
  const { file: requested } = await ctx.params;
  const file = requested.endsWith(".csv") ? findExportFile(requested.slice(0, -".csv".length)) : undefined;
  if (!file) notFound();

  return new Response(await file.csv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportName(file.name)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
