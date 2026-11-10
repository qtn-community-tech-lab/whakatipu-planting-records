import type { AppRoute } from "@/lib/wrt/routes";
/**
 * Page scaffolding: heads, cards, sections. Thin wrappers over Canopy classes.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Eyebrow + H1. Canopy: headlines state the number. */
export function PageHead({
  eyebrow, title, lead, aside, back,
}: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; aside?: ReactNode; back?: { href: AppRoute; label: string } | undefined }) {
  return (
    <header className="cn-pagehead">
      <div className="cn-pagehead__text">
        {back && <Link href={back.href} className="wrt-back">← {back.label}</Link>}
        {eyebrow && <span className="cn-eyebrow">{eyebrow}</span>}
        <h1 className="cn-h1 cn-h1--compact">{title}</h1>
        {lead && <p className="wrt-prose m-0">{lead}</p>}
      </div>
      {aside && <div className="flex flex-wrap gap-2 flex-none">{aside}</div>}
    </header>
  );
}

export function Card({
  title, action, foot, children, className, variant, id,
}: {
  title?: ReactNode;
  action?: ReactNode;
  foot?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "compact" | "table" | "hero";
  id?: string;
}) {
  return (
    <section id={id} className={cn("cn-card", variant && `cn-card--${variant}`, variant === "table" && "!pt-4", className)}>
      {(title || action) && (
        <div className={cn("cn-card__head", variant === "table" && "px-2.5 pb-2")}>
          {title && <h2 className="cn-card__title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
      {foot && <p className={cn("cn-card__foot m-0", variant === "table" && "px-2.5 pt-2")}>{foot}</p>}
    </section>
  );
}

export function CardLink({ href, children }: { href: AppRoute; children: ReactNode }) {
  return <Link href={href} className="cn-link whitespace-nowrap">{children} →</Link>;
}

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="cn-tile cn-tile--empty items-start p-6">
      <span className="cn-card__title text-[var(--text-body)]">{title}</span>
      {children && <span className="wrt-muted">{children}</span>}
    </div>
  );
}

/** A muted one-line rule under a card ("Explain the rule in one muted line"). */
export function Rule({ children }: { children: ReactNode }) {
  return <p className="wrt-rule m-0">{children}</p>;
}
