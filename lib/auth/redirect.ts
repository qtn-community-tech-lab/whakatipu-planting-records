import type { Route } from "next";

/** Keep callback and login return destinations on this app's origin. */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return "/";

  try {
    const url = new URL(value, "https://wrt.invalid");
    if (url.origin !== "https://wrt.invalid") return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

export function loginHref(next: string): Route {
  return `/login?next=${encodeURIComponent(safeReturnPath(next))}` as Route;
}
