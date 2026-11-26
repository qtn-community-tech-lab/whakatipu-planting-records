"use server";

import { hasActiveStaffEmail, sendMagicLink } from "@/db/queries/auth";
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

const initialMessage =
  "If this email is approved, a sign-in link will arrive shortly.";

export async function requestMagicLink(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawEmail = formData.get("email");
  const submittedEmail = typeof rawEmail === "string" ? rawEmail : "";
  const next = safeReturnPath(formData.get("next"));
  const parsed = loginEmailSchema.safeParse(submittedEmail);
  if (!parsed.success)
    return {
      status: "error",
      email: submittedEmail,
      next,
      fieldError: parsed.error.issues[0]?.message,
    };
  const email = parsed.data;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:3000"
      : undefined);
  if (!appUrl)
    return {
      status: "error",
      email,
      next,
      message: "Sign-in is not configured. Contact a WRT administrator.",
    };

  try {
    const callback = new URL("/auth/confirm", appUrl);
    callback.searchParams.set("next", next);
    // Check public.users on every request: the Before User Created hook does not run for existing Auth identities.
    if (!(await hasActiveStaffEmail(email))) {
      // Send a neutral response if the email is not on the allowlist.
      return {
        status: "sent",
        email,
        next,
        message: initialMessage,
        requestedAt: Date.now(),
      };
    }

    const { error } = await sendMagicLink(email, callback.toString());
    // Keep the response neutral if the allowlist changes between the check and signup hook.
    if (error && error.status !== 403) {
      return {
        status: "error",
        email,
        next,
        message: "The sign-in request could not be sent. Please try again.",
      };
    }
    return {
      status: "sent",
      email,
      next,
      message: initialMessage,
      requestedAt: Date.now(),
    };
  } catch {
    console.error("Failed to request magic link for email:", email, "next:", next);
    return {
      status: "error",
      email,
      next,
      message: "The sign-in request could not be sent. Please try again.",
    };
  }
}
