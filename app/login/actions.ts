"use server";

import { sendMagicLink } from "@/db/queries/auth";
import { safeReturnPath } from "@/lib/auth/redirect";
import { loginEmailSchema } from "@/db/types";

export type LoginState = {
  status: "idle" | "sent" | "error";
  email: string;
  next: string;
  message?: string;
  fieldError?: string | undefined;
  requestedAt?: number;
};

const initialMessage = "If this email is approved, a sign-in link will arrive shortly.";

export async function requestMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = formData.get("email");
  const submittedEmail = typeof rawEmail === "string" ? rawEmail : "";
  const next = safeReturnPath(formData.get("next"));
  const parsed = loginEmailSchema.safeParse(submittedEmail);
  if (!parsed.success)
    return { status: "error", email: submittedEmail, next, fieldError: parsed.error.issues[0]?.message };
  const email = parsed.data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");
  const callback = new URL("/auth/confirm", appUrl);
  callback.searchParams.set("next", next);

  try {
    const { error } = await sendMagicLink(email, callback.toString());
    if (error && error.status !== 403) {
      return { status: "error", email, next, message: "The sign-in request could not be sent. Please try again." };
    }
    if (error?.status === 403) {
      // Before User Created rejects unapproved addresses. Keep the response neutral.
      return { status: "sent", email, next, message: initialMessage, requestedAt: Date.now() };
    }
    return { status: "sent", email, next, message: initialMessage, requestedAt: Date.now() };
  } catch {
    return { status: "error", email, next, message: "The sign-in request could not be sent. Please try again." };
  }
}
