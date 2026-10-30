"use client";

import { useEffect, useRef, useState } from "react";

export type TypePhase = "pending" | "typing" | "done";
export type TypeMode = "pending" | "type" | "instant";

/**
 * Types `text` in character by character once `mode` becomes "type"
 * ("instant" jumps to the full text, e.g. for entries the reader scrolled
 * past). Once started it runs to the end even if the mode flips back.
 * The DOM always holds the full text for SSR / no-JS; callers style the
 * "pending" phase (e.g. dimmed) under html.js[data-motion="full"].
 * Reduced motion finishes immediately.
 */
export function useTypewriter(text: string, mode: TypeMode, msPerChar: number, reduced: boolean, onDone?: () => void) {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<TypePhase>("pending");
  const started = useRef(false);
  const timer = useRef(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (mode === "pending" || started.current) return;
    started.current = true;
    if (reduced || mode === "instant") {
      timer.current = window.setTimeout(() => {
        setCount(text.length);
        setPhase("done");
      }, 0);
      return;
    }
    let i = 0;
    const tick = () => {
      i += 1;
      setCount(i);
      if (i < text.length) timer.current = window.setTimeout(tick, msPerChar);
      else {
        setPhase("done");
        onDoneRef.current?.();
      }
    };
    timer.current = window.setTimeout(() => {
      setPhase("typing");
      tick();
    }, msPerChar);
  }, [mode, text, msPerChar, reduced]);

  /* Only unmount stops a running typewriter. */
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { shown: phase === "pending" ? text : text.slice(0, count), phase };
}
