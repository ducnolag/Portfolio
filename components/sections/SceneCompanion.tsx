"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import { useRef, useState } from "react";
import { ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { useIsTouch, useReducedMotion } from "@/lib/hooks";

/**
 * Companion stage. Agent A's procedural capybara (the figurine on his shelf
 * in the mirror photo) is glued to this `[data-scene="companion"]` section:
 * 3.5 screens tall, transparent, pointer-transparent, sticky 100svh stage.
 * Progress is `useScroll` on the section, ["start start", "end end"]; line i
 * of `ui.scenes.companion.lines` shows while progress is in [i/3, (i+1)/3),
 * crossfading in 300 ms. The hint ("move your mouse") sits under the first
 * line during the first third only and is dropped on touch devices.
 * Desktop: text stays in the left 45% (the character sits lower-right).
 * Portrait: text in the bottom 40% (the character is in the upper 55%).
 * Reduced motion: the three lines stacked statically.
 */
export function SceneCompanion() {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const touch = useIsTouch();
  const lines = t(ui.scenes.companion.lines);
  const hint = t(ui.scenes.companion.hint);
  const name = t(ui.scenes.companion.name);
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(lines.length - 1, Math.max(0, Math.floor(v * lines.length))));
  });

  const label = lines.join(" ");
  const lineCls =
    "m-0 max-w-none text-[clamp(1.375rem,2.6vw,2.25rem)] font-medium leading-[1.2] tracking-[-0.015em] text-fg";

  if (reduced) {
    return (
      <section ref={ref} data-scene="companion" className="relative flex min-h-[100svh] items-end" aria-label={label}>
        <div className="container-x pb-[clamp(3rem,8vh,5rem)] pt-[55svh] lg:pt-40">
          <p className="sr-only">{name}</p>
          <div className="max-w-[28ch] lg:max-w-[45%]">
            {lines.map((l) => (
              <p key={l} className={`${lineCls} [&+&]:mt-3`}>
                {l}
              </p>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      data-scene="companion"
      className="pointer-events-none relative h-[350svh]"
      aria-label={label}
    >
      <div className="sticky top-0 flex h-[100svh] items-end">
        {/* flat-to-clear scrim under the text only */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-ink/70 to-transparent lg:hidden" />
        <div className="container-x relative pb-[clamp(3rem,8vh,5rem)]">
          <div className="sr-only">
            <p>{name}</p>
            {lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
            {!touch && <p>{hint}</p>}
          </div>
          {/* Left 45% on landscape; the lower 40% of a portrait screen (text block + padding) */}
          <div aria-hidden className="relative h-[5.6em] max-w-[28ch] text-[clamp(1.375rem,2.6vw,2.25rem)] font-medium leading-[1.2] tracking-[-0.015em] lg:max-w-[45%]">
            {lines.map((l, i) => (
              <div
                key={l}
                className="absolute inset-x-0 bottom-0 transition-opacity duration-300 ease-out"
                style={{ opacity: i === active ? 1 : 0 }}
              >
                <p className={lineCls}>{l}</p>
                {i === 0 && !touch && (
                  <p className="m-0 mt-3 max-w-none text-[0.9375rem] font-normal tracking-normal text-orchid">{hint}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
