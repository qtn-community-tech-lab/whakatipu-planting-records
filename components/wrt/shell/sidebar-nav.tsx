"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_FOOT, NAV_MAIN, isActive } from "./nav";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const item = (n: { href: string; label: string }) => (
    <Link
      key={n.href}
      href={n.href}
      className="cn-nav__item"
      aria-current={isActive(pathname, n.href) ? "page" : undefined}
      onClick={onNavigate}
    >
      {n.label}
    </Link>
  );
  return (
    <>
      <nav className="cn-nav" aria-label="Main">{NAV_MAIN.map(item)}</nav>
      <nav className="cn-nav cn-nav--foot" aria-label="About">{NAV_FOOT.map(item)}</nav>
    </>
  );
}

export function Crumb() {
  const pathname = usePathname();
  const label = NAV_MAIN.concat(NAV_FOOT as never).find((n) => n.href !== "/" && pathname.startsWith(n.href));
  if (pathname === "/") return <span className="wrt-topbar__crumb">Overview</span>;
  if (!label) return <span className="wrt-topbar__crumb" />;
  const deeper = pathname !== label.href;
  return (
    <span className="wrt-topbar__crumb">
      {deeper ? <Link href={label.href}>{label.label}</Link> : label.label}
    </span>
  );
}
