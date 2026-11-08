import { redirect } from "next/navigation";

/**
 * Temporary: there is no list of planting events until the database is
 * connected, so /events sends people to the form. Revisit then: /events may
 * become the events list again, with "new" under it.
 */
export default function EventsPage() {
  redirect("/events/new");
}
