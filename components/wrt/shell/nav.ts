export const NAV_MAIN = [
  { href: "/", label: "Overview" },
  { href: "/sites", label: "Sites" },
  { href: "/species", label: "Species" },
  { href: "/seasons", label: "Seasons" },
  { href: "/records", label: "Records" },
] as const;

export const NAV_FOOT = [{ href: "/about-the-data", label: "About the data" }] as const;

export function sectionFor(pathname: string): string {
  if (pathname === "/") return "Overview";
  const all = [...NAV_MAIN, ...NAV_FOOT];
  return all.find((n) => n.href !== "/" && pathname.startsWith(n.href))?.label ?? "";
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
