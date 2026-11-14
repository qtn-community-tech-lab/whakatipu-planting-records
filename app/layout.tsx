import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import Link from "next/link";
import "./globals.css";
import { getWrt, reviewShown } from "@/lib/wrt/server";
import { buildSearchIndex } from "@/lib/wrt/build-search-index";
import { SidebarNav, SidebarFootNav, Crumb } from "@/components/wrt/shell/sidebar-nav";
import { MobileNav } from "@/components/wrt/shell/mobile-nav";
import { GlobalSearch } from "@/components/wrt/shell/global-search";
import { GrowthRings, type RingSeason } from "@/components/wrt/shell/growth-rings";
import { BrandMark } from "@/components/wrt/shell/nav-icons";
import { Contours } from "@/components/wrt/shell/contours";
import { ReviewSwitch } from "@/components/wrt/shell/review-switch";
import { AuthControl } from "@/components/wrt/shell/auth-control";
import { ConnectionStatus } from "@/components/wrt/shell/connection-status";
import { ServiceWorker } from "@/components/wrt/shell/service-worker";
import type { NavCounts } from "@/components/wrt/shell/nav";
import { formatNumber } from "@/lib/wrt/text";
import { isAuthenticated } from "@/db/queries/auth";

export const metadata: Metadata = {
  title: { default: "Restoration history · Whakatipu Reforestation Trust", template: "%s · WRT restoration history" },
  description: "Explore the WRT planting history by site, species, year and season.",
  appleWebApp: { capable: true, title: "WRT history", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1f4d34",
};

export default async function RootLayout({ children }: Readonly<LayoutProps<"/">>) {
  const [overview, index, showReview, authenticated] = await Promise.all([
    getWrt().overview(), buildSearchIndex(), reviewShown(), isAuthenticated(),
  ]);
  const range = `${overview.firstSeason.label} → ${overview.lastSeason.label}`;
  const counts: NavCounts = {
    sites: formatNumber(overview.placeCount),
    species: formatNumber(overview.speciesCount),
    seasons: formatNumber(overview.seasons.length),
    records: formatNumber(overview.split.records),
  };
  const rings: RingSeason[] = overview.seasons.map((p) => ({
    slug: p.season.slug,
    label: p.season.label,
    autumn: p.season.name === "Autumn",
    total: p.split.total,
    needsReview: p.split.needsReview,
  }));
  return (
    <html lang="en-NZ" data-review={showReview ? "shown" : "hidden"}>
      <body className="cn-app">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 cn-btn cn-btn--primary cn-btn--sm">
          Skip to content
        </a>
        <div className="wrt-shell">
          <div className="wrt-shell__side">
            <aside className="wrt-side">
              <Contours />
              <Link href="/" className="wrt-side__brand">
                <BrandMark />
                <span className="wrt-side__brandtext">
                  <span className="wrt-side__name">Whakatipu Reforestation Trust</span>
                  <span className="wrt-side__sub">Restoration history</span>
                </span>
              </Link>
              <SidebarNav counts={counts} authenticated={authenticated} />
              <GrowthRings seasons={rings} />
              <SidebarFootNav />
            </aside>
          </div>
          <div className="wrt-shell__body">
            <div className="wrt-mobilebar">
              <Link href="/" className="wrt-mobilebar__brand">
                <BrandMark size={34} />
                <span className="cn-sidebar__brand !p-0">
                  <span className="cn-sidebar__name !text-[15px]">Whakatipu Reforestation Trust</span>
                  <span className="cn-sidebar__sub">Restoration history</span>
                </span>
              </Link>
              <AuthControl authenticated={authenticated} />
              <MobileNav counts={counts} authenticated={authenticated} />
            </div>
            <header className="wrt-topbar">
              <Crumb />
              <GlobalSearch index={index} />
              <ReviewSwitch shown={showReview} />
              <div className="wrt-topbar__auth"><AuthControl authenticated={authenticated} /></div>
              <span className="cn-topbar__date !ml-0 hidden xl:inline-flex whitespace-nowrap" title="Seasons covered by the records">
                {range}
              </span>
            </header>
            <ConnectionStatus />
            <ViewTransition default="wrt-page-fade">
              <main id="main" className="wrt-main">
                {children}
              </main>
            </ViewTransition>
          </div>
        </div>
        <SpeedInsights />
        <ServiceWorker />
      </body>
    </html>
  );
}
