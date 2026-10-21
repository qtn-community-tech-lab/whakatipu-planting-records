/**
 * Filter / sort chips that are plain links, so they work without JS.
 * The current choice is marked with aria-current and the pressed Canopy style.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ChipLink {
  key: string;
  label: string;
  href: string;
  active: boolean;
  count?: number;
}

export function ChipLinks({ label, chips }: { label: string; chips: ChipLink[] }) {
  return (
    <nav aria-label={label} className="cn-chips">
      {chips.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          scroll={false}
          aria-current={c.active ? "true" : undefined}
          className={cn(
            "cn-chip no-underline",
            c.active && "!bg-[var(--action-primary)] !border-[var(--action-primary)] !text-white",
          )}
        >
          {c.label}
          {c.count !== undefined && <span className="cn-chip__count">{c.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
