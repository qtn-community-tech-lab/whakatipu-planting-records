import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, signOut, verifyMagicLink } from "@/db/queries/auth";
import { safeReturnPath } from "@/lib/auth/redirect";

function internalRedirect(path: string) {
  // Relative redirects preserve the cookie host; Next.js normalizes loopback URLs to localhost.
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

function loginRedirect(next: string, error = "expired") {
  return internalRedirect(`/login?${new URLSearchParams({ error, next })}`);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const next = safeReturnPath(params.get("next"));
  if (!tokenHash) return loginRedirect(next);

  let error: unknown;
  try {
    ({ error } = await verifyMagicLink(tokenHash));
  } catch {
    return loginRedirect(next);
  }
  if (error) return loginRedirect(next);

  if (!(await isAuthenticated())) {
    await signOut();
    return loginRedirect(next, "not-approved");
  }

  return internalRedirect(next);
}
