import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getWrt } from "@/lib/wrt/server";
import { buildSearchIndex } from "@/lib/wrt/build-search-index";
import { SidebarNav, Crumb } from "@/components/wrt/shell/sidebar-nav";
import { MobileNav } from "@/components/wrt/shell/mobile-nav";
import { GlobalSearch } from "@/components/wrt/shell/global-search";

export const metadata: Metadata = {
  title: { default: "Restoration history · Whakatipu Reforestation Trust", template: "%s · WRT restoration history" },
  description: "Explore every recorded WRT planting season since Autumn 2015 by site, species, year and season.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [overview, index] = await Promise.all([getWrt().overview(), buildSearchIndex()]);
  const range = `${overview.firstSeason.label} → ${overview.lastSeason.label}`;
  return (
    <html lang="en-NZ">
      <body className="cn-app">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 cn-btn cn-btn--primary cn-btn--sm">
          Skip to content
        </a>
        <div className="wrt-shell">
          <div className="wrt-shell__side">
            <aside className="cn-sidebar">
              <Link href="/" className="cn-sidebar__brand !no-underline">
                <span className="cn-sidebar__name">Whakatipu Reforestation Trust</span>
                <span className="cn-sidebar__sub">Restoration history</span>
              </Link>
              <SidebarNav />
            </aside>
          </div>
          <div className="wrt-shell__body">
            <div className="wrt-mobilebar">
              <Link href="/" className="cn-sidebar__brand !p-0">
                <span className="cn-sidebar__name !text-[15px]">Whakatipu Reforestation Trust</span>
                <span className="cn-sidebar__sub">Restoration history</span>
              </Link>
              <MobileNav />
            </div>
            <header className="wrt-topbar">
              <Crumb />
              <GlobalSearch index={index} />
              <span className="cn-topbar__date !ml-0 hidden md:inline-flex whitespace-nowrap" title="Seasons covered by the records">
                {range}
              </span>
            </header>
            <main id="main" className="wrt-main">
              <p className="wrt-notice" role="note">
                <span>
                  <b>Recorded plants, not verified plantings.</b> The history was filled from allocation sheets.{" "}
                  <span className="text-[var(--cn-behind-fg)]">Amber</span> marks plants on records WRT still has to rule on.
                </span>
                <Link href="/about-the-data">How to read these numbers</Link>
              </p>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
