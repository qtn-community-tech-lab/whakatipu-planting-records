"use client";
/**
 * The "New planting event" form, in three steps: Where and when → What was
 * planted → Check and submit. Nothing is saved yet: Submit shows a "Not
 * saved" preview of the checked event.
 *
 * Markup only: state, validation and submit are in useEventForm; each step's
 * fields are in their own component, built from the shared inputs in
 * components/ui/inputs.
 */
import { useEffect, useRef, useState } from "react";
import type { EventFormOptions } from "@/lib/wrt/events/form-options";
import { EVENT_STEPS, LAST_STEP, STEP } from "@/lib/wrt/events/steps";
import { describeEvent } from "@/lib/wrt/events/summary";
import { EventSummary } from "./event-summary";
import { NotSavedPreview } from "./not-saved-preview";
import { StepIndicator } from "./step-indicator";
import { useEventForm } from "./use-event-form";
import { WhatPlantedStep } from "./what-planted-step";
import { WhereWhenStep } from "./where-when-step";

interface EventFormProps {
  options: EventFormOptions;
  /** NZ today, "YYYY-MM-DD" (from the server so it matches the validator). */
  today: string;
}

/** "Start another" begins a fresh form by remounting it. */
export function EventForm(props: EventFormProps) {
  const [round, setRound] = useState(0);
  return <PlantingEventForm key={round} {...props} focusOnMount={round > 0} onStartAnother={() => setRound((r) => r + 1)} />;
}

function PlantingEventForm({ options, today, focusOnMount, onStartAnother }: EventFormProps & {
  focusOnMount: boolean;
  onStartAnother: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const form = useEventForm({ options, today, formRef, headingRef });
  const { step } = form;

  useEffect(() => { if (focusOnMount) headingRef.current?.focus(); }, [focusOnMount]);

  if (form.preview) {
    return <NotSavedPreview summary={describeEvent(form.preview, options)} onBack={form.closePreview} onStartAnother={onStartAnother} />;
  }

  return (
    <form ref={formRef} className="ev-form" onSubmit={form.submit} noValidate aria-label="New planting event">
      <StepIndicator step={step} furthest={form.furthest} onGoTo={form.goTo} />
      <h2 ref={headingRef} tabIndex={-1} className="ev-step-title">
        <span className="ev-step-title__count">Step {step + 1} of {EVENT_STEPS.length}</span>
        {EVENT_STEPS[step]?.title}
      </h2>

      {Object.keys(form.errors).length > 0 && (
        <div className="cn-callout cn-callout--risk cn-callout--sm" role="alert">
          {form.errors.form ?? "Some details need fixing. They are marked below."}
        </div>
      )}

      {step === STEP.whereWhen && <WhereWhenStep form={form} options={options} today={today} />}
      {step === STEP.whatPlanted && <WhatPlantedStep form={form} options={options} />}
      {step === STEP.check && (form.checkedEvent
        ? <section className="cn-card ev-section"><EventSummary summary={describeEvent(form.checkedEvent, options)} onChange={form.goTo} /></section>
        : (
          <div className="cn-callout cn-callout--risk cn-callout--sm">
            Some details need fixing before they can be checked.{" "}
            <button type="button" className="cn-btn cn-btn--soft cn-btn--sm" onClick={form.showFirstProblem}>Show me</button>
          </div>
        ))}

      <div className="ev-actions">
        {step > 0 && <button type="button" className="cn-btn cn-btn--secondary" onClick={form.back}>Back</button>}
        <button type="submit" className="cn-btn cn-btn--primary">{step < LAST_STEP ? "Next" : "Submit"}</button>
      </div>
    </form>
  );
}
