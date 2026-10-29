"use client";

import { createElement, useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";

export type RevealVariant = "rise" | "fade" | "line" | "mask" | "settle";

/**
 * Marks an element as revealed once it enters the viewport (top 12% in).
 * The hidden state is pure CSS, applied only under `html.js` and
 * `html[data-motion="full"]` (the in-site motion switch), so the first paint,
 * no-JS and reduced motion all show the finished page. Fires once; never replays.
 */
export function useRevealRef<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.in = "";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.in = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

type Tag = "div" | "p" | "li" | "ul" | "h2" | "h3" | "span" | "figure" | "section" | "article";

type Props = {
  children: ReactNode;
  as?: Tag;
  /** rise: 24px + fade · fade · line: from a mask-line · mask: clip from the bottom · settle: 1.08 → 1 */
  variant?: RevealVariant;
  /** ms, used for reading-order and row staggers */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  id?: string;
};

export function Reveal({ children, as = "div", variant = "rise", delay = 0, className, style, id }: Props) {
  const ref = useRevealRef<HTMLElement>();
  return createElement(
    as,
    {
      ref,
      id,
      className,
      "data-reveal": variant,
      style: { ...style, "--d": `${delay}ms` } as CSSProperties,
    },
    variant === "line" ? createElement("span", { className: "block" }, children) : children,
  );
}
