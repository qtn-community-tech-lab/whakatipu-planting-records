import { strToU8, zipSync } from "fflate";
import { requireAuthenticated } from "@/db/queries/auth";
import { todayInNz } from "@/lib/wrt/events/season";
import { exportName } from "@/lib/wrt/export/csv";
import { EXPORT_FILES, exportReadme } from "@/lib/wrt/export/files";

/** GET /export/all: every export file and a README in one zip. Signed-out visitors go to sign-in. */
export async function GET() {
  await requireAuthenticated("/export");
  const now = new Date();
  const folder = exportName("planting_data", now);
  const csvs = await Promise.all(EXPORT_FILES.map(async (file) => [`${folder}/${file.name}.csv`, strToU8(await file.csv())] as const));
  const zip = zipSync({
    ...Object.fromEntries(csvs),
    [`${folder}/README.txt`]: strToU8(exportReadme(todayInNz(now))),
  });

  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${folder}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
