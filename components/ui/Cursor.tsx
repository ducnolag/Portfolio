"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/hooks";

const INTERACTIVE =
  'a, button, [role="button"], input, select, textarea, label, summary, [data-cursor="link"]';

type CursorState = "idle" | "link" | "grab" | "down" | "hidden";

/**
 * Ring + dot cursor for fine pointers: orchid ring, neon dot. Position runs
 * through motion values (no React render per move); state flips a data
 * attribute that CSS animates. The grab state follows
 * `document.body.dataset.grab === "1"`, which the WebGL badge sets on hover.
 * The system cursor is hidden only while this component is mounted.
 */
export function Cursor() {
  const [fine, setFine] = useState(false);
  const reduced = useReducedMotion();
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springCfg = reduced
    ? { stiffness: 2000, damping: 80, mass: 0.1 }
    : { stiffness: 520, damping: 42, mass: 0.5 };
  const rx = useSpring(x, springCfg);
  const ry = useSpring(y, springCfg);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (hover: hover)");
    const apply = () => setFine(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!fine) return;
    const root = document.documentElement;
    root.dataset.customCursor = "";

    let state: CursorState = "hidden";
    let hover: "idle" | "link" = "idle";
    let pressed = false;

    const setState = (next: CursorState) => {
      if (next === state) return;
      state = next;
      if (ringRef.current) ringRef.current.dataset.state = next;
      if (dotRef.current) dotRef.current.dataset.state = next;
    };
    const resolve = () => {
      const grab = document.body.dataset.grab === "1";
      setState(pressed ? "down" : grab && hover === "idle" ? "grab" : hover);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      resolve();
    };
    const onOver = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (!el || typeof el.closest !== "function") return;
      hover = el.closest(INTERACTIVE) ? "link" : "idle";
      resolve();
    };
    const onDown = () => {
      pressed = true;
      resolve();
    };
    const onUp = () => {
      pressed = false;
      resolve();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.relatedTarget === null) setState("hidden");
    };
    const onBlur = () => setState("hidden");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    window.addEventListener("blur", onBlur);

    return () => {
      delete root.dataset.customCursor;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerout", onLeave);
      window.removeEventListener("blur", onBlur);
    };
  }, [fine, x, y]);

  if (!fine) return null;

  return (
    <>
      <motion.div
        ref={ringRef}
        aria-hidden
        data-state="hidden"
        className="cursor-ring"
        style={{ x: rx, y: ry }}
      >
        {/* open hand: the badge can be grabbed here */}
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
          <path d="M11 11.5V4.5a1.5 1.5 0 0 1 3 0V12" />
          <path d="M14 11.5V6a1.5 1.5 0 0 1 3 0v6" />
          <path d="M17 12.5V8.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-2.5a5 5 0 0 1-4-2l-3.2-4.3a1.6 1.6 0 0 1 2.4-2.1L8 14.5" />
        </svg>
      </motion.div>
      <motion.div
        ref={dotRef}
        aria-hidden
        data-state="hidden"
        className="cursor-dot"
        style={{ x, y }}
      />
    </>
  );
}
