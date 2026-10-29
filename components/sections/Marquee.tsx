"use client";

import { useEffect, useRef } from "react";
import { ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";

/**
 * One edge-to-edge marquee: `ui.marquee` twice for a seamless loop, linear,
 * about 40s per pass, magenta on ink. Paused on hover, while off screen and
 * under reduced motion (where it is a static line).
 */
export function Marquee() {
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const text = t(ui.marquee);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) delete el.dataset.paused;
      else el.dataset.paused = "";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="marquee ground-ink py-[clamp(2.5rem,6vh,4.5rem)] text-magenta"
      role="presentation"
    >
      <div className="marquee-track font-condensed text-[clamp(3rem,8vw,8rem)] font-bold leading-[1] tracking-[-0.03em]">
        <span className="marquee-copy">{text}</span>
        <span className="marquee-copy" aria-hidden>
          {text}
        </span>
      </div>
    </div>
  );
}
