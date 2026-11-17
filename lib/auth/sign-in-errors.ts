import { safeReturnPath } from "./redirect";

export const SIGN_IN_ERRORS = {
  expired: {
    title: "This sign-in link has expired or was already used",
    description:
      "Request a new link below and use the most recent email. Sign-in links can only be used once.",
  },
  "invalid-link": {
    title: "This sign-in link could not be opened",
    description:
      "The link is incomplete or has an unsupported format. Request a new link below. If this keeps happening, contact a WRT administrator.",
  },
  "verification-failed": {
    title: "We could not complete your sign-in",
    description:
      "There was a problem checking your sign-in link. Request a new link and try again. If this keeps happening, contact a WRT administrator.",
  },
  "not-approved": {
    title: "This email does not have active staff access",
    description: "Contact a WRT administrator if you think this is a mistake.",
  },
} as const;

export type SignInError = keyof typeof SIGN_IN_ERRORS;

export function signInError(code: unknown): SignInError {
  if (typeof code === "string" && Object.hasOwn(SIGN_IN_ERRORS, code))
    return code as SignInError;
  return code === "otp_expired" ? "expired" : "verification-failed";
}

/** Supabase may redirect to the site URL with errors in the fragment, which the server cannot read. */
export function authErrorRedirect(url: URL): string | null {
  const fragment = new URLSearchParams(url.hash.slice(1));
  const hasError = (params: URLSearchParams) =>
    ["error", "error_code", "error_description"].some((key) => params.has(key));

  // App error codes on /login are already rendered by the server; avoid a redirect loop.
  if (
    url.pathname === "/login" &&
    !hasError(fragment) &&
    !url.searchParams.has("error_code") &&
    !url.searchParams.has("error_description")
  )
    return null;

  const params = hasError(fragment) ? fragment : url.searchParams;
  if (!hasError(params)) return null;

  const error = signInError(params.get("error_code") || params.get("error"));
  const next = safeReturnPath(url.searchParams.get("next"));
  // Do not copy provider descriptions or credentials into the next URL.
  return `/login?${new URLSearchParams({ error, next })}`;
}
