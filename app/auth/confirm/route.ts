import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated, signOut, verifyMagicLink } from "@/db/queries/auth";
import { safeReturnPath } from "@/lib/auth/redirect";

function loginRedirect(request: NextRequest, next: string, error = "expired") {
  const destination = new URL("/login", request.url);
  destination.searchParams.set("error", error);
  destination.searchParams.set("next", next);
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const next = safeReturnPath(params.get("next"));
  if (!tokenHash) return loginRedirect(request, next);

  let error: unknown;
  try {
    ({ error } = await verifyMagicLink(tokenHash));
  } catch {
    return loginRedirect(request, next);
  }
  if (error) return loginRedirect(request, next);

  if (!(await isAuthenticated())) {
    await signOut();
    return loginRedirect(request, next, "not-approved");
  }

  return NextResponse.redirect(new URL(next, request.url));
}
