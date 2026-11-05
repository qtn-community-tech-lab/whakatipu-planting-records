"use server";
/**
 * Save and delete planting events.
 *
 * Trust boundary: Server Actions are public POST endpoints, so every input is
 * treated as untrusted and re-validated here with the same validator the form
 * uses (lib/wrt/events/validate.ts).
 *
 * ponytail: no login yet (prototype). When staff auth arrives, check the
 * session at the top of each action before touching the store.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eventLookups } from "@/lib/wrt/events/form-options";
import { todayInNz } from "@/lib/wrt/events/season";
import { getEventStore } from "@/lib/wrt/events/server";
import { validateEventInput, type FieldErrors } from "@/lib/wrt/events/validate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type SaveResult = { ok: false; errors: FieldErrors };

/**
 * Create (id null) or update an event. On success it redirects to the list,
 * so the only value it ever returns is a set of field errors.
 */
export async function saveEvent(id: string | null, input: unknown): Promise<SaveResult> {
  if (id !== null && !UUID.test(id)) return { ok: false, errors: { form: "That event could not be found." } };

  const result = validateEventInput(input, await eventLookups(), todayInNz());
  if (!result.ok) return result;

  const store = getEventStore();
  try {
    if (id === null) {
      await store.create(result.value);
    } else if (!(await store.update(id, result.value))) {
      return { ok: false, errors: { form: "That event no longer exists. It may have been deleted." } };
    }
  } catch (err) {
    console.error("[events] save failed", err);
    return { ok: false, errors: { form: "The event could not be saved. Nothing was changed; try again." } };
  }

  revalidatePath("/events");
  redirect(`/events?saved=${id === null ? "created" : "updated"}`);
}

/** Delete an event (the form asks for confirmation first). Used as a <form action>. */
export async function deleteEvent(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id === "string" && UUID.test(id)) await getEventStore().delete(id);
  revalidatePath("/events");
  redirect("/events?saved=deleted");
}
