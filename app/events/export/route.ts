import { getEventStore } from "@/lib/wrt/events/server";
import { eventsToCsv } from "@/lib/wrt/events/events-csv";
import { todayInNz } from "@/lib/wrt/events/season";
import { eventViews } from "@/lib/wrt/events/views";

/**
 * GET /events/export — every planting event as CSV, one line per species,
 * with each event's area as GeoJSON (see lib/wrt/events/events-csv.ts).
 */
export async function GET() {
  const views = await eventViews(await getEventStore().list());
  return new Response(eventsToCsv(views), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wrt-planting-events-${todayInNz()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
