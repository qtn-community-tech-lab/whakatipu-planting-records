export type NavIcon = "overview" | "sites" | "species" | "seasons" | "records" | "about";
export type NavCountKey = "sites" | "species" | "seasons" | "records";
export type NavCounts = Partial<Record<NavCountKey, string>>;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  count?: NavCountKey;
}

export const NAV_MAIN: readonly NavItem[] = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/sites", label: "Sites", icon: "sites", count: "sites" },
  { href: "/species", label: "Species", icon: "species", count: "species" },
  { href: "/seasons", label: "Seasons", icon: "seasons", count: "seasons" },
  { href: "/records", label: "Records", icon: "records", count: "records" },
];

export const NAV_FOOT: readonly NavItem[] = [{ href: "/about-the-data", label: "About the data", icon: "about" }];

export function sectionFor(pathname: string): string {
  if (pathname === "/") return "Overview";
  const all = [...NAV_MAIN, ...NAV_FOOT];
  return all.find((n) => n.href !== "/" && pathname.startsWith(n.href))?.label ?? "";
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
