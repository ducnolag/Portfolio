"use client";

import { RobotHead, type RobotHeadState } from "robot-heads";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/hooks";
import { guideState } from "@/lib/guide";
import { answer, greeting, type Answer, type ChatLink } from "@/lib/lagBrain";
import { Icon } from "./Icon";

type Msg = { id: number; from: "lag" | "you"; text: string; links?: ChatLink[]; suggestions?: string[]; typed?: boolean };

const SHELL = "#7c3aed";
const TRIM = "#9c92c4";
const SCREEN = "#efeafc";

const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

/** One bot message that types itself in (12ms/char) and reports when it is done. */
function LagMessage({ msg, reduced, onDone, onChip }: { msg: Msg; reduced: boolean; onDone: (id: number) => void; onChip: (s: string) => void }) {
  const [count, setCount] = useState(msg.typed || reduced ? msg.text.length : 0);
  useEffect(() => {
    if (msg.typed || reduced) return;
    let i = 0;
    let t = 0;
    const tick = () => {
      i += 2;
      setCount(Math.min(i, msg.text.length));
      if (i < msg.text.length) t = window.setTimeout(tick, 24);
      else onDone(msg.id);
    };
    t = window.setTimeout(tick, 24);
    return () => window.clearTimeout(t);
  }, [msg, reduced, onDone]);
  const done = count >= msg.text.length;
  return (
    <li className="chat-msg chat-msg-lag">
      <p className="m-0 max-w-none whitespace-pre-wrap text-[0.9375rem] leading-[1.5]">
        {msg.text.slice(0, count)}
        {!done && <span className="caret" aria-hidden />}
      </p>
      {done && msg.links && msg.links.length > 0 && (
        <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
          {msg.links.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="link-arrow text-[0.875rem]">
                {l.label}
                <Icon name="arrow-up-right" size={14} />
              </a>
            </li>
          ))}
        </ul>
      )}
      {done && msg.suggestions && msg.suggestions.length > 0 && (
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
          {msg.suggestions.map((s) => (
            <li key={s}>
              <button type="button" className="chip" onClick={() => onChip(s)}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Floating chat with Lag. Local retrieval over the page's content
 * (lib/lagBrain.ts); the avatar's face follows the conversation. Sets
 * `guideState.chatOpen` so the 3D Lag can react.
 */
export function LagChat() {
  const { t, lang } = useLang();
  const reduced = useReducedMotion();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [face, setFace] = useState<RobotHeadState>("idle");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  /* Greeting on first open */
  useEffect(() => {
    guideState.chatOpen = open;
    if (!open) return;
    const focus = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(focus);
  }, [open]);

  const push = useCallback((m: Omit<Msg, "id">) => {
    idRef.current += 1;
    const id = idRef.current;
    setMsgs((prev) => [...prev, { ...m, id }]);
    return id;
  }, []);

  const openChat = () => {
    setOpen(true);
    if (msgs.length === 0) {
      const g = greeting(lang);
      push({ from: "lag", text: g.text, suggestions: g.suggestions });
      setFace("happy");
    }
  };
  const closeChat = () => {
    setOpen(false);
    setFace("idle");
    buttonRef.current?.focus();
  };

  const ask = (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    push({ from: "you", text: question });
    setBusy(true);
    setFace("thinking");
    const delay = reduced ? 0 : 500 + Math.random() * 400;
    window.setTimeout(() => {
      const a: Answer = answer(question, lang);
      setFace(a.mood === "error" ? "error" : "speaking");
      push({ from: "lag", text: a.text, links: a.links, suggestions: a.suggestions });
      if (a.mood !== "speaking") {
        // happy / error faces hold a beat, then the typing takes over
        window.setTimeout(() => setFace("speaking"), 700);
      }
    }, delay);
  };

  const onDone = useCallback((id: number) => {
    setMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, typed: true } : m)));
    setBusy(false);
    setFace("idle");
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeChat();
  };

  /* Keep the newest message in view */
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="chat-fab"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t(ui.chat.open)}
        onClick={open ? closeChat : openChat}
      >
        {mounted ? (
          <RobotHead size={40} state={open ? face : "idle"} interactive={false} color={SHELL} trimColor={TRIM} screenColor={SCREEN} aria-hidden />
        ) : (
          <span aria-hidden className="block size-10 rounded-[10px] bg-[var(--violet)]" />
        )}
        <span className="chat-fab-label">{t(ui.chat.open)}</span>
      </button>

      {open && (
        <section id={panelId} className="chat-panel" role="dialog" aria-modal="false" aria-label={t(ui.chat.title)} onKeyDown={onKey}>
          <header className="chat-head">
            {mounted && <RobotHead size={36} state={face} interactive={false} color={SHELL} trimColor={TRIM} screenColor={SCREEN} aria-hidden />}
            <p className="m-0 max-w-none flex-1 text-[0.9375rem] font-semibold leading-tight">{t(ui.chat.title)}</p>
            <button type="button" className="icon-btn" aria-label={t(ui.chat.close)} onClick={closeChat}>
              <Icon name="close" size={20} />
            </button>
          </header>

          <ol ref={listRef} className="chat-list" aria-live="polite">
            {msgs.map((m) =>
              m.from === "lag" ? (
                <LagMessage key={m.id} msg={m} reduced={reduced} onDone={onDone} onChip={ask} />
              ) : (
                <li key={m.id} className="chat-msg chat-msg-you">
                  <p className="m-0 max-w-none text-[0.9375rem] leading-[1.5]">{m.text}</p>
                </li>
              ),
            )}
            {busy && face === "thinking" && (
              <li className="chat-msg chat-msg-lag text-fg-muted">
                <p className="m-0 max-w-none text-[0.875rem]">{t(ui.chat.thinking)}</p>
              </li>
            )}
          </ol>

          <form className="chat-form" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t(ui.chat.placeholder)}
              aria-label={t(ui.chat.placeholder)}
              autoComplete="off"
              enterKeyHint="send"
            />
            <button type="submit" className="btn btn-primary h-10 px-4" disabled={busy || !input.trim()}>
              {t(ui.chat.send)}
              <Icon name="arrow-right" size={16} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
