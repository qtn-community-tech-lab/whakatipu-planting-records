"use server";
import { cookies } from "next/headers";
import { REVIEW_COOKIE, REVIEW_HIDDEN } from "@/lib/wrt/review-scope";

/** The switch in the page notice: include records still needing review, or confirmed records only. */
export async function setReviewShown(formData: FormData) {
  const store = await cookies();
  if (formData.get("show") === "1") {
    store.delete(REVIEW_COOKIE);
  } else {
    store.set(REVIEW_COOKIE, REVIEW_HIDDEN, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
}
