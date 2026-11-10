"use client";
/**
 * What Submit shows while nothing can be saved: the checked event, clearly
 * labelled "Not saved". Focus moves to its heading when it appears.
 */
import { useEffect, useId, useRef } from "react";
import type { EventSummary as Summary } from "@/lib/wrt/events/summary";
import { EventSummary } from "./event-summary";

export function NotSavedPreview({ summary, onBack, onStartAnother }: {
  summary: Summary;
  /** Back to the form, values kept. */
  onBack: () => void;
  /** A fresh, empty form. */
  onStartAnother: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section className="cn-card ev-section" aria-labelledby={`${uid}-title`}>
      <div className="cn-card__head">
        <h2 id={`${uid}-title`} ref={headingRef} tabIndex={-1} className="cn-card__title">Planting event preview</h2>
        <span className="cn-badge cn-badge--behind">Not saved</span>
      </div>
      <p className="cn-callout cn-callout--sm" role="status">
        Every detail checks out, but nothing was saved: this prototype can’t store planting events yet.
      </p>
      <EventSummary summary={summary} />
      <div className="ev-actions ev-actions--static">
        <button type="button" className="cn-btn cn-btn--secondary" onClick={onBack}>Back to the form</button>
        <button type="button" className="cn-btn cn-btn--primary" onClick={onStartAnother}>Start another</button>
      </div>
    </section>
  );
}
