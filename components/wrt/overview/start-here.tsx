import type { AppRoute } from "@/lib/wrt/routes";
/**
 * "Start exploring": the questions staff actually ask, each one a link.
 */
import Link from "next/link";
import { NavGlyph } from "@/components/wrt/shell/nav-icons";
import type { NavIcon } from "@/components/wrt/shell/nav";

export interface StartQuestion {
  href: AppRoute;
  question: string;
  answer: string;
  icon?: NavIcon;
}

export function StartHere({ questions }: { questions: StartQuestion[] }) {
  return (
    <div className="wrt-start">
      {questions.map((q, i) => (
        <Link key={q.href} href={q.href} className="wrt-start__card" data-tone={i % 3}>
          <span className="wrt-start__icon">
            <NavGlyph name={q.icon ?? "overview"} />
          </span>
          <span className="wrt-start__q">{q.question}</span>
          <span className="wrt-start__a">{q.answer}</span>
          <span className="wrt-start__go" aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  );
}
