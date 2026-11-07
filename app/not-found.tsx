import Link from "next/link";
import type { Metadata } from "next";
import { Card, PageHead } from "@/components/wrt/shared/page";

export const metadata: Metadata = { title: "Page not found" };

const LINKS = [
  { href: "/sites", title: "Sites", line: "Every site, ranked by recorded plants." },
  { href: "/species", title: "Species", line: "Every species, with its names and where it went." },
  { href: "/seasons", title: "Seasons", line: "Explore the planting history, season by season." },
];

export default function NotFound() {
  return (
    <>
      <PageHead
        eyebrow="Page not found"
        title="There is nothing at this address"
        lead="The link may be out of date, or the site, species or season may be spelled differently in the records. Try one of the lists below, or use the search at the top of the page."
      />
      <Card title="Start from a list" foot="Search ignores macrons and capitals, so “manuka”, “Mānuka” and “MANUKA” all find the same species.">
        <div className="wrt-grid wrt-grid--3">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="cn-tile !text-[var(--text-strong)] hover:bg-[var(--surface-tint)]">
              <span className="cn-tile__label">{l.title} →</span>
              <span className="wrt-muted">{l.line}</span>
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
