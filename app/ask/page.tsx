"use client";
/**
 * /ask: chat with the planting history, laid out like the demo (WRT chat artifact):
 * steps above each answer, then its cards and text; a dock with the season timeline, the scope bar
 * and the composer; and a Dev switch for the inspector (components/wrt/chat-dev.tsx).
 * Clicking a site or species opens it in a sidebar; a part or a season asks about it; cmd-click opens the page.
 */
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Next, PlaceCard, SpeciesCard, Steps, ToolPart, nextQuestions, placeNext, speciesNext } from "@/components/wrt/chat-cards";
import { ChatDev, useDev } from "@/components/wrt/chat-dev";
import { ScopeBar, Timeline, scopeOf, scopeWhere } from "@/components/wrt/chat-scope";
import { PageHead } from "@/components/wrt/page";
import type { ChatMessage, Scope } from "@/lib/chat-tools";
import type { SeasonPoint } from "@/lib/wrt/queries";
import { openDetail, timeline } from "./actions";

const STARTERS = [
  "Tell me about Lake Hayes",
  "What went in at Whitechapel in 2019?",
  "What does kōwhai look like, and where did it go?",
  "Which sites have gone quiet?",
  "What still needs a WRT ruling?",
];

const unslug = (s: string) => s.replace(/-/g, " ");

export default function AskPage() {
  const { messages, sendMessage, status, stop, error } = useChat<ChatMessage>();
  const [text, setText] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const [dev, setDev] = useDev();

  // Scope: what the last answer looked at, minus any chip the user cleared since.
  const found = scopeOf(messages);
  const foundKey = JSON.stringify(found);
  const [off, setOff] = useState<{ key: string; keys: string[] }>({ key: "", keys: [] });
  const cleared = off.key === foundKey ? off.keys : []; // a new answer brings a new scope
  const scope: Scope = {
    ...(cleared.includes("place") ? {} : { place: found.place, part: found.part }),
    ...(cleared.includes("species") ? {} : { species: found.species }),
    ...(cleared.includes("when") ? {} : { season: found.season, year: found.year }),
  };
  const scopeKey = JSON.stringify(scope);

  function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    sendMessage({ text: q }, { body: { scope } }); // the route turns it into one prompt line (scopeLine)
    setText("");
  }

  // Timeline for the scope.
  const [points, setPoints] = useState<SeasonPoint[] | null>(null);
  useEffect(() => {
    let live = true;
    timeline(JSON.parse(scopeKey) as Scope).then((p) => { if (live) setPoints(p); });
    return () => { live = false; };
  }, [scopeKey]);

  // Keep the newest message in view as it streams (the margin clears the sticky dock).
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ block: "end" }); }, [messages, status]);

  // Sidebar: a site or species link opens here instead of leaving the chat.
  const [side, setSide] = useState<{ href: string; detail: Awaited<ReturnType<typeof openDetail>> | null } | null>(null);

  async function onLink(e: MouseEvent) {
    const href = (e.target as HTMLElement).closest("a")?.getAttribute("href");
    if (!href || e.metaKey || e.ctrlKey || e.shiftKey) return;
    // A part of a site ("Gorge Rd Wetlands") or a season column is asked about in the chat.
    const part = href.match(/^\/sites\/([a-z0-9-]+)\/parts\/([a-z0-9-]+)$/);
    const season = href.match(/^\/seasons\/(autumn|spring)-(\d{4})$/);
    if (part || season) {
      e.preventDefault();
      setSide(null);
      if (part) return ask(`What's recorded at ${unslug(part[2])} in ${unslug(part[1])}?`);
      const w = scopeWhere(scope);
      const sp = scope.species?.name;
      return ask(`What was recorded${sp ? ` of ${sp}` : ""}${w ? ` at ${w}` : ""} in ${season![1][0].toUpperCase()}${season![1].slice(1)} ${season![2]}?`);
    }
    const m = href.match(/^\/(sites|species)\/([a-z0-9-]+)(?:\?(.*))?$/);
    if (!m || (e.target as HTMLElement).closest("[data-full-page]")) return;
    e.preventDefault();
    setSide({ href, detail: null });
    const at = new URLSearchParams(m[3] ?? ""); // ?place=…&part=… when opened from a card about a site
    const detail = await openDetail(m[1] === "sites" ? "place" : "species", m[2], at.get("place"), at.get("part"));
    setSide((s) => (s?.href === href ? { href, detail } : s)); // ignore a slow reply after another click
  }

  const d = side?.detail;

  return (
    <div className={dev ? "wrt-ask wrt-ask--dev" : "wrt-ask"}>
      <div className="wrt-ask__main" onClickCapture={onLink}>
        <PageHead
          eyebrow="Ask"
          title="Ask the planting history"
          lead="Answers come from the same data as every other page: recorded plants, with the part that still needs a WRT ruling."
          aside={<button type="button" className="cn-chip wrt-devswitch" aria-pressed={dev} onClick={() => setDev(!dev)}>Dev</button>}
        />

        <div className="wrt-chat" aria-live="polite">
          {messages.length === 0 && (
            <div className="wrt-pills">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="cn-chip" onClick={() => ask(s)}>{s}</button>
              ))}
            </div>
          )}

          {messages.map((m, mi) => {
            // Follow-ups from the last card of the newest answer, once it has finished.
            const newest = mi === messages.length - 1 && m.role === "assistant" && !busy;
            const next = newest ? m.parts.map(nextQuestions).filter((q) => q.length).at(-1) ?? [] : [];
            return (
              <div key={m.id} className={`wrt-chat__msg wrt-chat__msg--${m.role}`}>
                {m.role === "assistant" && <Steps parts={m.parts} />}
                {m.parts.map((part, i) =>
                  part.type === "text"
                    // The prompt asks for plain text; this catches the odd *italic* or **bold** that slips through.
                    ? <p key={i} className="wrt-chat__text">{part.text.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")}</p>
                    : <ToolPart key={i} part={part} onAsk={ask} />,
                )}
                <Next questions={next} onAsk={ask} />
              </div>
            );
          })}

          {error && <p className="wrt-chat__error">The answer didn&apos;t come through. Try asking again.</p>}
          <div ref={end} style={{ scrollMarginBottom: 200 }} />
        </div>

        <div className="wrt-chat__dock">
          <Timeline scope={scope} points={points} />
          <ScopeBar scope={scope} onClear={(k) => setOff({ key: foundKey, keys: [...cleared, k] })} />
          <form className="wrt-chat__composer" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
            <label htmlFor="ask" className="sr-only">Ask about a site, species or season</label>
            <textarea
              id="ask" rows={1} value={text} placeholder="Ask about a site, species or season…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(text); } }}
            />
            {busy
              ? <button type="button" className="cn-btn cn-btn--secondary" onClick={stop}>Stop</button>
              : <button type="submit" className="cn-btn cn-btn--primary" disabled={!text.trim()}>Ask</button>}
          </form>
        </div>
      </div>

      {dev && <ChatDev messages={messages} scope={scope} status={status} />}

      <Sheet open={!!side} onOpenChange={(open) => { if (!open) setSide(null); }}>
        {side && (
          <SheetContent className="wrt-chat__sheet" title={side.href.startsWith("/sites") ? "Site" : "Species"} onClickCapture={onLink}>
            {!d ? <p className="wrt-muted">Loading…</p>
              : !d.found ? <p className="wrt-muted">Not found in the planting history.</p>
              : "place" in d ? <PlaceCard o={d} /> : <SpeciesCard o={d} />}
            {d?.found && (
              <>
                <Next questions={"place" in d ? placeNext(d) : speciesNext(d)} onAsk={(q) => { setSide(null); ask(q); }} />
                <div className="wrt-pills">
                  <a href={side.href.split("?")[0]} data-full-page="true" className="cn-btn cn-btn--secondary">Open full page</a>
                </div>
              </>
            )}
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
