import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, signOut, verifyMagicLink } from "@/db/queries/auth";
import { safeReturnPath } from "@/lib/auth/redirect";
import { signInError, type SignInError } from "@/lib/auth/sign-in-errors";

function internalRedirect(path: string) {
  // Relative redirects preserve the cookie host; Next.js normalizes loopback URLs to localhost.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: path, "Cache-Control": "no-store" },
  });
}

function loginRedirect(next: string, error: SignInError) {
  return internalRedirect(`/login?${new URLSearchParams({ error, next })}`);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const next = safeReturnPath(params.get("next"));
  if (
    params.has("error") ||
    params.has("error_code") ||
    params.has("error_description")
  ) {
    return loginRedirect(
      next,
      signInError(params.get("error_code") || params.get("error")),
    );
  }
  if (!tokenHash) return loginRedirect(next, "invalid-link");

  try {
    const { error } = await verifyMagicLink(tokenHash);
    if (error) return loginRedirect(next, signInError(error.code));

    if (!(await isAuthenticated())) {
      await signOut();
      return loginRedirect(next, "not-approved");
    }
  } catch {
    return loginRedirect(next, "verification-failed");
  }

  return internalRedirect(next);
}
