"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type CSSProperties } from "react";
import { profile, ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/hooks";
import { Icon } from "@/components/ui/Icon";

const EASE = [0.16, 1, 0.3, 1] as const;
const ROLE_INTERVAL = 2800;

/** The name, authored as two lines so each can rise from behind its own baseline. */
const NAME_LINES = ["Nguyễn", "Mạnh Đức"] as const;

/** Roles as a crisp word-swap in the serif voice (latin words only). */
function Roles() {
  const { t } = useLang();
  const roles = t(profile.roles);
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced || roles.length < 2) return;
    let id = 0;
    const tick = () => {
      id = window.setTimeout(() => {
        if (!document.hidden) setI((n) => (n + 1) % roles.length);
        tick();
      }, ROLE_INTERVAL);
    };
    tick();
    return () => window.clearTimeout(id);
  }, [reduced, roles.length]);

  /* One line, never wrapping: the longest role ("Full-stack Builder") fits a 328px column at 1.375rem. */
  const cls =
    "font-serif italic text-[clamp(1.375rem,4.4vw,2.75rem)] leading-[1.25] tracking-[-0.01em] text-orchid";

  if (reduced) {
    return <p className={`m-0 max-w-none ${cls}`}>{roles.join(" · ")}</p>;
  }

  const current = roles[i % roles.length];

  return (
    <p className={`relative m-0 max-w-none ${cls}`}>
      <span className="sr-only">{roles.join(", ")}</span>
      {/* Fixed-height clipped line box; entering and exiting words are both absolute inside it,
          so nothing can ever render below the line. */}
      <span aria-hidden className="relative block h-[1.25em] overflow-clip whitespace-nowrap">
        <AnimatePresence initial={false}>
          <motion.span
            key={current}
            className="absolute inset-x-0 top-0 block leading-[1.25]"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "-105%", transition: { duration: 0.3, ease: EASE } }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            {current}
          </motion.span>
        </AnimatePresence>
      </span>
    </p>
  );
}

/**
 * First screen. The WebGL badge hangs in the right ~45% on landscape (above
 * the copy on portrait), so the text layer is pointer-transparent except for
 * its controls: a throw that crosses the words still works.
 */
export function Hero() {
  const { t } = useLang();

  return (
    <section className="relative min-h-[100svh]" aria-labelledby="hero-name">
      <div className="container-x pointer-events-none relative flex min-h-[100svh] flex-col justify-end pb-[clamp(5rem,11svh,8rem)] pt-24 lg:justify-center lg:pb-24 lg:pt-16">
        {/* Copy column: at most 56% of the width on landscape, so the WebGL ring and glyphs own the right side */}
        <div className="lg:w-[56%] lg:max-w-[56%]">
          <h1 id="hero-name" className="m-0 text-left">
            <span
              className="hero-load mb-3 block text-[clamp(1.0625rem,1.5vw,1.375rem)] font-medium tracking-normal text-orchid"
              style={{ "--d": "60ms" } as CSSProperties}
            >
              {t(ui.hero.greeting)}
            </span>
            <span className="block text-[clamp(2.75rem,7.2vw,6rem)] font-bold leading-[0.95] tracking-[-0.035em] [font-stretch:95%]">
              {NAME_LINES.map((line, i) => (
                <span key={line} className="hero-line">
                  <span style={{ "--i": i } as CSSProperties}>{line}</span>
                </span>
              ))}
            </span>
          </h1>

          <div className="hero-load mt-6 lg:mt-7" style={{ "--d": "520ms" } as CSSProperties}>
            <Roles />
          </div>

          <p
            className="hero-load mt-4 max-w-[34ch] lg:mt-6 text-[clamp(1.0625rem,1.25vw,1.25rem)] leading-[1.5] text-fg"
            style={{ "--d": "640ms" } as CSSProperties}
          >
            {t(profile.tagline)}
          </p>

          <div
            className="hero-load pointer-events-auto mt-6 flex lg:mt-8 flex-wrap items-center gap-3"
            style={{ "--d": "740ms" } as CSSProperties}
          >
            <a href="#projects" className="btn btn-primary">
              {t(ui.hero.cta)}
              <Icon name="arrow-right" size={18} />
            </a>
            <a href="#contact" className="btn btn-ghost">
              {t(ui.hero.ctaSecondary)}
            </a>
          </div>
        </div>
      </div>

      {/* Hint, bottom-left: the badge is a real object */}
      <p
        className="hero-load hero-corner pointer-events-none absolute bottom-7 left-[var(--gutter)] m-0 flex max-w-[calc(100%-var(--gutter)*2-3.5rem)] items-center gap-2 text-[0.9375rem] text-fg-muted sm:max-w-none"
        style={{ "--d": "980ms" } as CSSProperties}
      >
        <Icon name="hand" size={20} className="shrink-0 text-orchid" />
        {t(ui.hero.hint)}
      </p>

      {/* Scroll cue, bottom-right: the word only from 640px up; below that, the neon drop alone */}
      <p
        className="hero-load hero-corner pointer-events-none absolute bottom-7 right-[var(--gutter)] m-0 flex max-w-none items-center gap-3 text-[0.9375rem] text-fg-muted"
        style={{ "--d": "1040ms" } as CSSProperties}
      >
        <span className="hidden sm:inline">{t(ui.hero.scroll)}</span>
        <span className="sr-only sm:hidden">{t(ui.hero.scroll)}</span>
        <span className="scroll-cue" aria-hidden>
          <span />
        </span>
      </p>
    </section>
  );
}
