"use client";
/**
 * /ask: chat with the planting history, laid out like the demo (WRT chat artifact):
 * steps above each answer, then its cards and text; a floating composer (components/wrt/ask/chat-composer.tsx)
 * holding the scope chips, New, and the Dev switch for the inspector (components/wrt/ask/chat-dev.tsx).
 * Clicking a site or species opens it in a sidebar; a part or a season asks about it; cmd-click opens the page.
 */
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Next, PlaceCard, SpeciesCard, Steps, ToolPart, nextQuestions, placeNext, speciesNext } from "@/components/wrt/ask/chat-cards";
import { ChatDev, useDev } from "@/components/wrt/ask/chat-dev";
import { Composer } from "@/components/wrt/ask/chat-composer";
import { scopeOf, scopeWhere } from "@/components/wrt/ask/chat-scope";
import type { ChatMessage, Scope } from "@/lib/wrt/chat-tools";
import { openDetail } from "./actions";

const STARTERS = [
  "Which sites have the most recorded plants?",
  "What was recorded in the latest planting season?",
  "What does kōwhai look like, and where did it go?",
  "Which tall trees have we recorded?",
  "Which threatened plants have we recorded?",
  "What went into school sites?",
];

const unslug = (s: string) => s.replace(/-/g, " ");

export default function AskPage() {
  // Throttled so a streaming answer repaints at most every 40 ms instead of on every token.
  const { messages, sendMessage, setMessages, status, stop, error } = useChat<ChatMessage>({ experimental_throttle: 40 });
  const [text, setText] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const [dev, setDev] = useDev();
  // ↑ in an empty composer brings this back.
  const lastQuestion = messages.findLast((m) => m.role === "user")?.parts.flatMap((p) => (p.type === "text" ? [p.text] : []))[0];

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

  function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    stick.current = true; // a new question always brings the view down
    sendMessage({ text: q }, { body: { scope } }); // the route turns it into one prompt line (scopeLine)
    setText("");
  }

  // Follow the answer as it streams, unless the reader has scrolled up to read something else.
  const end = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const onScroll = () => { const el = end.current; if (el) stick.current = el.getBoundingClientRect().top < innerHeight + 160; };
    addEventListener("scroll", onScroll, { capture: true, passive: true }); // capture: the app scrolls inside its shell
    return () => removeEventListener("scroll", onScroll, { capture: true });
  }, []);
  useEffect(() => { if (messages.length && stick.current) end.current?.scrollIntoView({ block: "end" }); }, [messages, status]);

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
      <section className="wrt-ask__main" onClickCapture={onLink} aria-label="Conversation">
        {messages.length > 0 && <h1 className="sr-only">Ask the planting history</h1>}
        <div className="wrt-ask__stream">
          <div className="wrt-chat" aria-live="polite">
            {messages.length === 0 && (
              <div className="wrt-ask__intro">
                <h1 className="wrt-ask__hello">Ask the planting history</h1>
                <p>Sites, parts of sites, plants and seasons, answered from the same records as every other page. Click a site or plant in an answer to open it beside the chat.</p>
                <div className="wrt-pills">
                  {STARTERS.map((s) => (
                    <button key={s} type="button" className="cn-chip" onClick={() => ask(s)}>{s}</button>
                  ))}
                </div>
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
            <div ref={end} />
          </div>
        </div>

        <div className="wrt-chat__dock">
          <Composer
            value={text} onChange={setText} onSend={ask} status={status} onStop={stop}
            scope={scope} onClearScope={(k) => setOff({ key: foundKey, keys: [...cleared, k] })}
            lastQuestion={lastQuestion}
            onNew={messages.length ? () => { setMessages([]); setSide(null); } : undefined}
            dev={dev} onDev={setDev} resting={messages.length === 0}
          />
        </div>
      </section>

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
