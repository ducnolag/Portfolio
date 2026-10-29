"use client";

import { motion, useMotionValue, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FocusEvent } from "react";
import { projects, ui, type Project } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/hooks";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Tilt } from "@/components/ui/Tilt";

/** Project accents in the neon-violet palette. */
const ACCENT: Record<string, string> = {
  toolify: "var(--violet)",
  sv5t: "var(--electric)",
  "banking-churn": "var(--magenta)",
};
const accentOf = (p: Project) => ACCENT[p.slug] ?? "var(--orchid)";

const FEATURED = projects.filter((p) => p.featured);
const OTHERS = projects.filter((p) => !p.featured);

const PIN_QUERY = "(min-width: 1024px)";

function FeaturedCard({ project: p }: { project: Project }) {
  const { t } = useLang();
  return (
    <li className="gallery-card">
      <Tilt className="h-full" surfaceClassName="h-full">
        <article
          className="relative flex h-full flex-col overflow-clip rounded-[var(--radius-l)] bg-ink-2 p-[clamp(1.25rem,2.6vw,2.75rem)]"
          style={{ "--accent": accentOf(p) } as CSSProperties}
        >
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[var(--accent)]" />
          {/* Poster: the title holds the top, the body sits on the bottom edge in two columns */}
          <h3 className="font-condensed m-0 max-w-[12ch] text-[clamp(2.5rem,6.4vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.035em]">
            <a
              href={p.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline transition-colors duration-200 hover:text-[var(--accent)]"
            >
              {p.title}
            </a>
          </h3>
          <div className="mt-auto grid gap-x-10 gap-y-5 pt-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-5">
              <p className="m-0 max-w-[24ch] text-[clamp(1.25rem,1.7vw,1.625rem)] font-medium leading-[1.25] tracking-[-0.01em] text-fg">
                {t(p.tagline)}
              </p>
              <p className="m-0 mt-4 max-w-none text-[0.9375rem] text-fg-muted tabular-nums">
                {p.year} · {p.stack.join(" · ")}
              </p>
            </div>
            <div className="lg:col-span-7">
              <p className="m-0 max-w-[58ch] text-[1.0625rem] leading-[1.55] text-fg lg:line-clamp-5">{t(p.description)}</p>
              <ul className="m-0 mt-4 list-none space-y-1 p-0 text-[0.9375rem] leading-[1.5] text-fg-muted">
                {t(p.highlights).map((h) => (
                  <li key={h} className="flex gap-3">
                    <span aria-hidden className="mt-[0.7em] h-px w-4 shrink-0 bg-[var(--accent)]" />
                    {h}
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-5 max-w-none">
                <a href={p.repo} target="_blank" rel="noopener noreferrer" className="link-arrow">
                  <Icon name="github" size={18} />
                  {t(ui.projects.viewRepo)}
                  <Icon name="arrow-up-right" size={16} />
                </a>
              </p>
            </div>
          </div>
        </article>
      </Tilt>
    </li>
  );
}

/**
 * Selected work. On ≥1024px with motion allowed, the three featured cards
 * move sideways while the vertical scroll holds the stage: the held block is
 * (100svh + dx) tall where dx = track overflow, so 1px of scroll is 1px of
 * travel and the hold ends when the last card meets the right margin
 * (x = −progress × dx via useScroll on the block, ["start start", "end end"]).
 * Phones, narrow windows, reduced motion and rows over three screens get the
 * native drag row with scroll snapping. The four other projects follow as a
 * quiet two-column list.
 */
export function Projects() {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const galleryRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const [pinned, setPinned] = useState(false);
  const [height, setHeight] = useState<string | undefined>(undefined);
  const dx = useMotionValue(0);

  const { scrollYProgress } = useScroll({ target: galleryRef, offset: ["start start", "end end"] });
  const x = useTransform(() => -scrollYProgress.get() * dx.get());

  const measure = useCallback(() => {
    const root = galleryRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    const wide = window.matchMedia(PIN_QUERY).matches && !reduced;
    if (!wide) {
      delete root.dataset.pinned;
      dx.set(0);
      setPinned(false);
      setHeight(undefined);
      return;
    }
    root.dataset.pinned = ""; // measure the row as it would be when pinned
    const d = track.scrollWidth - track.clientWidth;
    const on = d > 0 && d < window.innerHeight * 3;
    if (!on) delete root.dataset.pinned;
    dx.set(on ? d : 0);
    setPinned(on);
    setHeight(on ? `calc(100svh + ${Math.round(d)}px)` : undefined);
  }, [dx, reduced]);

  useEffect(() => {
    const raf = requestAnimationFrame(measure);
    const mq = window.matchMedia(PIN_QUERY);
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
    };
  }, [measure]);

  /* Keyboard: a focused card is brought into view by scrolling the page. */
  const onFocus = (e: FocusEvent<HTMLUListElement>) => {
    const root = galleryRef.current;
    const track = trackRef.current;
    if (!pinned || !root || !track) return;
    const card = (e.target as HTMLElement).closest<HTMLElement>(".gallery-card");
    if (!card) return;
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const target = Math.min(dx.get(), Math.max(0, card.offsetLeft - pad));
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY + target, behavior: "instant" });
  };

  return (
    <section id="projects" className="ground-ink scroll-mt-16" aria-labelledby="projects-heading">
      <div ref={galleryRef} className="gallery" data-pinned={pinned ? "" : undefined} style={{ height }}>
        <div className="gallery-stage pt-[clamp(6.5rem,10vw,9rem)] pb-[clamp(3rem,6vw,5rem)]">
          <div className="container-x">
            <h2
              id="projects-heading"
              className="m-0 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1] tracking-[-0.03em]"
            >
              <span className="mask-line">
                <Reveal as="span" variant="line">
                  {t(ui.projects.heading)}
                </Reveal>
              </span>
            </h2>
          </div>

          <motion.ul
            ref={trackRef}
            className="gallery-track mt-[clamp(2rem,4vw,3.5rem)]"
            style={pinned ? { x } : undefined}
            onFocus={onFocus}
          >
            {FEATURED.map((p) => (
              <FeaturedCard key={p.slug} project={p} />
            ))}
          </motion.ul>

          {!pinned && (
            <p className="container-x mt-5 flex max-w-none items-center gap-2 text-[0.9375rem] text-fg-muted">
              <Icon name="arrow-right" size={16} />
              {t(ui.projects.dragHint)}
            </p>
          )}
        </div>
      </div>

      {/* The other four: a quiet list */}
      <div className="container-x pb-[clamp(4rem,8vw,7rem)] pt-[clamp(3rem,6vw,5rem)]">
        <ul className="m-0 grid list-none gap-x-10 border-t border-line p-0 md:grid-cols-2">
          {OTHERS.map((p, i) => (
            <Reveal as="li" key={p.slug} variant="rise" delay={i * 80} className="border-b border-line py-7 md:py-9">
              <article>
                <h3 className="m-0 text-[clamp(1.5rem,2.2vw,2rem)] font-semibold leading-[1.1] tracking-[-0.02em]">
                  <a href={p.repo} target="_blank" rel="noopener noreferrer" className="no-underline transition-colors duration-200 hover:text-orchid">
                    {p.title}
                  </a>
                </h3>
                <p className="mt-2 max-w-[48ch] text-[1.0625rem] leading-[1.5] text-fg">{t(p.tagline)}</p>
                <p className="mt-3 max-w-none text-[0.9375rem] text-fg-muted tabular-nums">
                  {p.year} · {p.stack.join(" · ")}
                </p>
              </article>
            </Reveal>
          ))}
        </ul>
        <p className="mt-8 max-w-none">
          <a href="https://github.com/ducnolag" target="_blank" rel="noopener noreferrer" className="link-arrow text-[1.0625rem]">
            {t(ui.projects.more)}
            <Icon name="arrow-up-right" size={18} />
          </a>
        </p>
      </div>
    </section>
  );
}
