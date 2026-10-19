"use client";
/**
 * Dev panel for /ask: what each answer looked up, with what, what came back, how long it took and
 * what it cost. Off by default; the Dev switch turns it on for this browser. The chat works without it.
 */
import { useSyncExternalStore } from "react";
import { isTool } from "@/components/wrt/ask/chat-cards";
import type { ChatMessage, Scope } from "@/lib/wrt/chat-tools";

const KEY = "wrt-ask-dev";
let fallback = false; // when the browser blocks storage
const read = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return fallback; } };
const subscribe = (cb: () => void) => { addEventListener("storage", cb); return () => removeEventListener("storage", cb); };

/** The Dev switch, remembered in this browser. */
export function useDev() {
  const dev = useSyncExternalStore(subscribe, read, () => false);
  const setDev = (on: boolean) => {
    fallback = on;
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
    dispatchEvent(new StorageEvent("storage"));
  };
  return [dev, setDev] as const;
}

const json = (v: unknown) => JSON.stringify(v, null, 1) ?? "";
const kb = (s: string) => `${(s.length / 1024).toFixed(1)} KB`;

export function ChatDev({ messages, scope, status }: { messages: ChatMessage[]; scope: Scope; status: string }) {
  const answers = messages.filter((m) => m.role === "assistant");
  const calls = answers.flatMap((m) => m.parts.filter(isTool));
  const uses = [...calls.reduce((m, p) => m.set(p.type.slice(5), (m.get(p.type.slice(5)) ?? 0) + 1), new Map<string, number>())];
  const last = answers.at(-1)?.metadata;
  const tokens = answers.reduce((n, m) => n + (m.metadata?.usage?.totalTokens ?? 0), 0);
  const question = (m: ChatMessage) => {
    const q = messages[messages.indexOf(m) - 1]?.parts.find((p) => p.type === "text");
    return q && "text" in q ? q.text : "(no question)";
  };

  return (
    <aside className="wrt-dev" aria-label="Dev panel">
      <header className="wrt-dev__head"><b>Inspector</b><span>{status}</span></header>
      <dl className="wrt-dev__kv">
        <dt>model</dt><dd>{last?.model ?? "—"}</dd>
        <dt>answers</dt><dd>{answers.length} · {calls.length} calls</dd>
        <dt>tokens</dt><dd>{tokens.toLocaleString()}</dd>
        <dt>last</dt><dd>{last?.ms != null ? `${(last.ms / 1000).toFixed(1)} s` : "—"}</dd>
      </dl>

      <section>
        <h3>Scope sent with the next question</h3>
        <pre>{json(scope)}</pre>
      </section>

      <section>
        <h3>Functions used</h3>
        <ul className="wrt-dev__fns">
          {uses.length ? uses.map(([k, n]) => <li key={k}><span>{k}</span><span>{n}</span></li>) : <li>none yet</li>}
        </ul>
      </section>

      <section>
        <h3>Calls, newest first</h3>
        {[...answers].reverse().map((m, i) => (
          <details key={m.id} open={i === 0}>
            <summary>
              {question(m)}
              <em>{[m.metadata?.ms != null && `${(m.metadata.ms / 1000).toFixed(1)} s`, m.metadata?.usage?.totalTokens && `${m.metadata.usage.totalTokens} tok`].filter(Boolean).join(" · ")}</em>
            </summary>
            {m.parts.filter(isTool).map((p, n) => {
              const out = "output" in p ? json(p.output) : "";
              return (
                <div key={p.toolCallId} className="wrt-dev__call">
                  <div className="wrt-dev__callhead"><span>{n + 1}</span><b>{p.type.slice(5)}</b><em>{p.state}{out && ` · ${kb(out)}`}</em></div>
                  <pre>{json(p.input)}</pre>
                  {out && <pre className="wrt-dev__out">{out.length > 1500 ? `${out.slice(0, 1500)}\n…` : out}</pre>}
                  {"errorText" in p && p.errorText && <pre className="wrt-dev__err">{p.errorText}</pre>}
                </div>
              );
            })}
          </details>
        ))}
      </section>
    </aside>
  );
}
