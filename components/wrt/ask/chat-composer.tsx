"use client";
/**
 * The /ask composer, styled after the video app's prompt bar (FeatureLab AiChatComposer):
 * one floating card, the question on top and a quiet row of pills underneath —
 * the scope chips on the left, New and Dev on the right, then a round send button
 * whose icon morphs between send, waiting and stop.
 *
 * Motion lives in styles/app.css (.wrt-composer*) and is switched off under reduced-motion.
 * Keys: Enter sends, Shift+Enter breaks the line, Esc stops an answer, ↑ in an empty box
 * brings back the last question.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Scope } from "@/lib/wrt/chat-tools";
import { scopeWhen } from "@/components/wrt/ask/chat-scope";

type Status = "ready" | "submitted" | "streaming" | "error";
type ScopeKey = "place" | "species" | "when";

const Svg = ({ children, size = 16 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);

/** Every icon stays mounted; the live one springs in while the rest shrink, turn and blur out. */
function SendIcon({ status }: { status: Status }) {
  const on = (s: Status | Status[]) => ([] as Status[]).concat(s).includes(status);
  return (
    <span className="wrt-composer__icons">
      <span className="wrt-composer__icon" data-on={on(["ready", "error"]) || undefined}>
        <Svg><path d="M12 19V5M5 12l7-7 7 7" /></Svg>
      </span>
      <span className="wrt-composer__icon" data-on={on("submitted") || undefined}>
        <i className="wrt-composer__spin" />
      </span>
      <span className="wrt-composer__icon" data-on={on("streaming") || undefined}>
        <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden><rect width={12} height={12} rx={2.5} fill="currentColor" /></svg>
      </span>
    </span>
  );
}

const ICON = {
  place: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  species: <><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" /><path d="M5 19 13 11" /></>,
  when: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
} satisfies Record<ScopeKey, ReactNode>;

export function Composer({
  value, onChange, onSend, status, onStop, scope, onClearScope, lastQuestion, onNew, dev, onDev, resting,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: (v: string) => void;
  status: Status;
  onStop: () => void;
  scope: Scope;
  onClearScope: (k: ScopeKey) => void;
  /** Recalled with ↑ when the box is empty. */
  lastQuestion?: string;
  /** Shown once there's a conversation to clear. */
  onNew?: () => void;
  dev: boolean;
  onDev: (on: boolean) => void;
  /** Before the first question: rest narrower and spring wider on focus. */
  resting?: boolean;
}) {
  const box = useRef<HTMLTextAreaElement>(null);
  const [composing, setComposing] = useState(false);
  const busy = status === "submitted" || status === "streaming";
  const canSend = !!value.trim() && !busy;

  // Grow with the text up to the CSS max-height, then scroll.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const chips = [
    scope.place && { key: "place" as const, label: scope.part ? `${scope.place.name} › ${scope.part}` : scope.place.name },
    scope.species && { key: "species" as const, label: scope.species.name },
    scopeWhen(scope) && { key: "when" as const, label: scopeWhen(scope) },
  ].filter((c): c is { key: ScopeKey; label: string } => !!c);

  return (
    <form
      className="wrt-composer"
      data-resting={resting || undefined}
      data-active={value.trim() ? true : undefined}
      onSubmit={(e) => { e.preventDefault(); if (busy) onStop(); else if (canSend) onSend(value); }}
    >
      <label htmlFor="ask" className="sr-only">Ask about a site, species or season</label>
      <textarea
        id="ask" ref={box} rows={1} value={value} className="wrt-composer__field"
        placeholder="Ask about a site, species or season…"
        onChange={(e) => onChange(e.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !composing && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (canSend) onSend(value);
          } else if (e.key === "Escape" && busy) {
            e.preventDefault();
            onStop();
          } else if (e.key === "ArrowUp" && !value && lastQuestion) {
            e.preventDefault();
            onChange(lastQuestion);
          }
        }}
      />

      <div className="wrt-composer__foot">
        <div className="wrt-composer__scope" aria-label="Scope of the next question">
          {chips.length ? chips.map((c, i) => (
            <span key={`${c.key}:${c.label}`} className="wrt-composer__chip" style={{ animationDelay: `${i * 35}ms` }} title={`Follow-ups stay on ${c.label}`}>
              <Svg size={12}>{ICON[c.key]}</Svg>
              <span>{c.label}</span>
              <button type="button" aria-label={`Clear ${c.label}`} onClick={() => onClearScope(c.key)}>
                <Svg size={10}><path d="M18 6 6 18M6 6l12 12" /></Svg>
              </button>
            </span>
          )) : (
            <span className="wrt-composer__all" title="Ask about anything; the scope follows what the answer looks at">
              <Svg size={12}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" /></Svg>
              All records
            </span>
          )}
        </div>

        <div className="wrt-composer__tools">
          {onNew && (
            <button type="button" className="wrt-composer__pill" disabled={busy} onClick={onNew} title="Start a new conversation">
              <Svg size={13}><path d="M12 5v14M5 12h14" /></Svg>
              New
            </button>
          )}
          <button type="button" className="wrt-composer__pill" aria-pressed={dev} onClick={() => onDev(!dev)} title="Show the tool calls behind each answer">
            <Svg size={13}><path d="m8 9-4 3 4 3M16 9l4 3-4 3" /></Svg>
            Dev
          </button>
          <button
            type="submit" className="wrt-composer__send" disabled={!busy && !canSend}
            aria-label={busy ? "Stop" : "Ask"} title={busy ? "Stop (Esc)" : "Ask (Enter)"}
          >
            <SendIcon status={status} />
          </button>
        </div>
      </div>
    </form>
  );
}
