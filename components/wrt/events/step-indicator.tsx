"use client";
/**
 * Where you are in the form: "1 Where and when · 2 What was planted · 3 Check
 * and submit". Steps already reached can be revisited; later ones can't be
 * skipped to.
 */
import { EVENT_STEPS } from "@/lib/wrt/events/steps";
import { cn } from "@/lib/utils";

export function StepIndicator({ step, furthest, onGoTo }: { step: number; furthest: number; onGoTo: (step: number) => void }) {
  return (
    <ol className="ev-steps" aria-label="Steps">
      {EVENT_STEPS.map((s, i) => {
        const label = <><span className="ev-steps__n" aria-hidden="true">{i + 1}</span><span className="ev-steps__title">{s.title}</span></>;
        const state = i === step ? "current" : i <= furthest ? "reached" : "later";
        return (
          <li key={s.title} className={cn("ev-steps__item", `ev-steps__item--${state}`)} aria-current={i === step ? "step" : undefined}>
            {state === "reached"
              ? <button type="button" className="ev-steps__link" onClick={() => onGoTo(i)}>{label}</button>
              : <span className="ev-steps__link">{label}</span>}
          </li>
        );
      })}
    </ol>
  );
}
