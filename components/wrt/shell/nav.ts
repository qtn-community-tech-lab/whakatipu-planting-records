export type NavIcon = "overview" | "sites" | "species" | "seasons" | "records" | "events" | "ask" | "about";
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
  // Prototype data entry (lib/wrt/events). The list of saved events is linked from the form page.
  { href: "/events/new", label: "New planting event", icon: "events" },
  { href: "/ask", label: "Ask", icon: "ask" },
];

export const NAV_FOOT: readonly NavItem[] = [{ href: "/about-the-data", label: "About the data", icon: "about" }];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
