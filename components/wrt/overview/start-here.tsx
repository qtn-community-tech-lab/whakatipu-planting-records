/**
 * "Start exploring": the questions staff actually ask, each one a link.
 */
import Link from "next/link";

export interface StartQuestion {
  href: string;
  question: string;
  answer: string;
}

export function StartHere({ questions }: { questions: StartQuestion[] }) {
  return (
    <div className="wrt-grid wrt-grid--3">
      {questions.map((q) => (
        <Link key={q.href} href={q.href} className="cn-tile !gap-2.5 !p-5 !no-underline hover:bg-[var(--surface-tint)] transition-colors">
          <span className="cn-row__title !text-[var(--text-strong)]">{q.question} →</span>
          <span className="cn-row__line">{q.answer}</span>
        </Link>
      ))}
    </div>
  );
}
