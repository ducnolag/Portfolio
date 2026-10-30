"use client";

import Image from "next/image";
import { motion, useMotionValue, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FocusEvent, type ReactNode } from "react";
import { projects, ui, type Project } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/hooks";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Tilt } from "@/components/ui/Tilt";

const FEATURED = projects.filter((p) => p.featured);
const OTHERS = projects.filter((p) => !p.featured);
const PIN_QUERY = "(min-width: 1024px)";

const accentVar = (p: Project) => `var(--${p.accent})`;

/** "Toolify for Everyone" → "TE"-style initials; single words take their first two letters. */
function initialsOf(title: string) {
  const words = title.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  const s = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? title).slice(0, 2);
  return s.toUpperCase();
}

/* ─── Generated covers: one procedural pattern per project, in its accent at low alpha on ink-3 ─── */
function Pattern({ slug }: { slug: string }) {
  switch (slug) {
    case "toolify": {
      // a grid of tool-like rounded tiles
      const tiles: ReactNode[] = [];
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 7; c++)
          tiles.push(
            <rect key={`${r}-${c}`} x={60 + c * 160} y={70 + r * 160} width={120} height={120} rx={26} opacity={0.22 + ((r * 7 + c) % 5) * 0.08} />,
          );
      return <g fill="currentColor">{tiles}</g>;
    }
    case "misher":
      // concentric voice-wave rings radiating from the lower left
      return (
        <g fill="none" stroke="currentColor" strokeWidth={12} strokeLinecap="round">
          {[90, 200, 310, 420, 530, 640, 750, 860, 970].map((r, i) => (
            <circle key={r} cx={150} cy={640} r={r} opacity={0.6 - i * 0.055} />
          ))}
        </g>
      );
    case "lab-manager": {
      // a seat-map grid with an aisle
      const seats: ReactNode[] = [];
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 12; c++) {
          const x = 90 + c * 86 + (c >= 6 ? 60 : 0);
          seats.push(<rect key={`${r}-${c}`} x={x} y={120 + r * 92} width={56} height={56} rx={10} opacity={(r + c) % 4 === 0 ? 0.6 : 0.22} />);
        }
      return <g fill="currentColor">{seats}</g>;
    }
    case "data-to-decision": {
      // bars and a decision line
      const bars = [220, 340, 280, 460, 390, 540, 480, 620];
      return (
        <g>
          {bars.map((h, i) => (
            <rect key={i} x={90 + i * 135} y={700 - h} width={78} height={h} rx={8} fill="currentColor" opacity={0.22} />
          ))}
          <polyline
            points={bars.map((h, i) => `${129 + i * 135},${660 - h * 0.85}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={10}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.8}
          />
        </g>
      );
    }
    case "sendmail":
      // stacked envelopes
      return (
        <g fill="none" stroke="currentColor" strokeWidth={8} strokeLinejoin="round">
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${160 + i * 70} ${120 + i * 110})`} opacity={0.75 - i * 0.15}>
              <rect x={0} y={0} width={620} height={380} rx={24} />
              <path d="M0 0 310 230 620 0" />
            </g>
          ))}
        </g>
      );
    default:
      return (
        <g stroke="currentColor" strokeWidth={6} opacity={0.3}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <line key={i} x1={i * 200 - 300} y1={750} x2={i * 200 + 450} y2={0} />
          ))}
        </g>
      );
  }
}

function GeneratedCover({ project: p, compact = false }: { project: Project; compact?: boolean }) {
  return (
    <div className="absolute inset-0 bg-ink-3" style={{ color: accentVar(p) }} aria-hidden>
      <svg viewBox="0 0 1200 750" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <Pattern slug={p.slug} />
      </svg>
      <span
        className={`font-condensed absolute bottom-[6%] left-[5%] font-extrabold leading-none tracking-[-0.04em] ${compact ? "text-[clamp(3rem,9vw,5rem)]" : "text-[clamp(4rem,12vw,9rem)]"}`}
        style={{ color: accentVar(p) }}
      >
        {initialsOf(p.title)}
      </span>
    </div>
  );
}

/** Cover frame: real screenshot or generated art; scroll parallax inside, scale on hover (CSS). */
function Cover({ project: p, compact = false, sizes }: { project: Project; compact?: boolean; sizes: string }) {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  return (
    <div ref={ref} className="pcover absolute inset-0 overflow-clip bg-ink-3">
      <motion.div className="absolute -inset-y-[8%] inset-x-0" style={reduced ? undefined : { y }}>
        <div className="pcover-media relative h-full w-full">
          {p.cover ? (
            <Image src={p.cover} alt={`${t(ui.projects.coverAlt)} ${p.title}`} fill sizes={sizes} className="object-cover object-top" />
          ) : (
            <GeneratedCover project={p} compact={compact} />
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Tags({ project: p }: { project: Project }) {
  const { t } = useLang();
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      <li className="tag">{t(p.visibility === "public" ? ui.projects.publicTag : ui.projects.privateTag)}</li>
      <li className="tag">{t(ui.projects.filters[p.category])}</li>
    </ul>
  );
}

function Actions({ project: p, compact = false }: { project: Project; compact?: boolean }) {
  const { t } = useLang();
  const demoLabel =
    p.demoKind === "ui-only" ? ui.projects.viewUiOnly : p.demoKind === "build" ? ui.projects.viewBuild : ui.projects.viewDemo;
  const size = compact ? "text-[0.9375rem]" : "text-[1rem]";
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
      {p.demo && (
        <li>
          <a href={p.demo} target="_blank" rel="noopener noreferrer" className={`link-arrow ${size}`}>
            {t(demoLabel)}
            <Icon name="arrow-up-right" size={16} />
          </a>
        </li>
      )}
      {p.repo && (
        <li>
          <a href={p.repo} target="_blank" rel="noopener noreferrer" className={`link-arrow ${size}`}>
            <Icon name="github" size={18} />
            {t(ui.projects.viewRepo)}
            <Icon name="arrow-up-right" size={16} />
          </a>
        </li>
      )}
    </ul>
  );
}

/** Featured poster: cover + body side by side on the held stage, stacked in the drag row. */
function FeaturedCard({ project: p, index }: { project: Project; index: number }) {
  const { t } = useLang();
  const primary = p.demo ?? p.repo;
  return (
    <Reveal as="li" variant="rise" delay={index * 80} className="gallery-card">
      <Tilt className="h-full" surfaceClassName="h-full">
        <article
          className="pcard relative flex h-full flex-col overflow-clip rounded-[var(--radius-l)] bg-ink-2 lg:flex-row"
          style={{ "--accent": accentVar(p) } as CSSProperties}
        >
          <span aria-hidden className="pcard-edge absolute inset-x-0 top-0 z-10 h-1 bg-[var(--accent)]" />
          <div className="relative aspect-[16/10] w-full lg:aspect-auto lg:h-full lg:w-[46%] lg:shrink-0">
            <Cover project={p} sizes="(min-width: 1024px) 34vw, 84vw" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-[clamp(1.25rem,2.2vw,2.25rem)] lg:gap-3.5">
            <h3 className="font-condensed m-0 text-[clamp(1.875rem,3.4vw,3.25rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
              {primary ? (
                <a href={primary} target="_blank" rel="noopener noreferrer" className="no-underline transition-colors duration-200 hover:text-[var(--accent)]">
                  {p.title}
                </a>
              ) : (
                p.title
              )}
            </h3>
            <p className="m-0 max-w-[32ch] text-[clamp(1.0625rem,1.3vw,1.25rem)] font-medium leading-[1.3] text-fg">{t(p.tagline)}</p>
            {p.role && <p className="m-0 max-w-none text-[0.9375rem] text-orchid">{t(p.role)}</p>}
            <p className="m-0 max-w-[58ch] text-[0.9375rem] leading-[1.5] text-fg-muted line-clamp-4 lg:line-clamp-3">{t(p.description)}</p>
            <ul className="m-0 list-none space-y-1 p-0 text-[0.9375rem] leading-[1.45] text-fg">
              {t(p.highlights).slice(0, 3).map((h) => (
                <li key={h} className="flex gap-3">
                  <span aria-hidden className="mt-[0.7em] h-px w-4 shrink-0 bg-[var(--accent)]" />
                  {h}
                </li>
              ))}
            </ul>
            <p className="m-0 max-w-none text-[0.875rem] text-fg-muted tabular-nums">
              {p.year} · {p.stack.join(" · ")}
            </p>
            <div className="mt-auto flex flex-col gap-3 pt-2">
              <Tags project={p} />
              <Actions project={p} />
            </div>
          </div>
        </article>
      </Tilt>
    </Reveal>
  );
}

/** Compact card for the grid: cover strip, title, tagline, stack, links. */
function GridCard({ project: p, index }: { project: Project; index: number }) {
  const { t } = useLang();
  const primary = p.demo ?? p.repo;
  return (
    <Reveal as="li" variant="rise" delay={(index % 2) * 80}>
      <Tilt max={3} className="h-full" surfaceClassName="h-full">
        <article
          className="pcard relative flex h-full flex-col overflow-clip rounded-[var(--radius-l)] bg-ink-2"
          style={{ "--accent": accentVar(p) } as CSSProperties}
        >
          <span aria-hidden className="pcard-edge absolute inset-x-0 top-0 z-10 h-1 bg-[var(--accent)]" />
          <div className="relative aspect-[2/1] w-full">
            <Cover project={p} compact sizes="(min-width: 768px) 46vw, 92vw" />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-[clamp(1.25rem,2vw,1.75rem)]">
            <h3 className="font-condensed m-0 text-[clamp(1.5rem,2.2vw,2rem)] font-extrabold leading-[1] tracking-[-0.03em]">
              {primary ? (
                <a href={primary} target="_blank" rel="noopener noreferrer" className="no-underline transition-colors duration-200 hover:text-[var(--accent)]">
                  {p.title}
                </a>
              ) : (
                p.title
              )}
            </h3>
            <p className="m-0 max-w-[40ch] text-[1rem] leading-[1.45] text-fg">{t(p.tagline)}</p>
            {p.role && <p className="m-0 max-w-none text-[0.875rem] text-orchid">{t(p.role)}</p>}
            <p className="m-0 max-w-none text-[0.875rem] text-fg-muted tabular-nums">
              {p.year} · {p.stack.join(" · ")}
            </p>
            <div className="mt-auto flex flex-col gap-3 pt-1">
              <Tags project={p} />
              <Actions project={p} compact />
            </div>
          </div>
        </article>
      </Tilt>
    </Reveal>
  );
}

/**
 * Selected work. On ≥1024px with motion allowed, the three featured posters
 * move sideways while the vertical scroll holds the stage: the held block is
 * (100svh + dx) tall where dx = track overflow, so 1px of scroll is 1px of
 * travel and the hold ends when the last card meets the right margin
 * (x = −progress × dx via useScroll on the block, ["start start", "end end"]).
 * Phones, narrow windows and reduced motion get the native drag row with
 * scroll snapping. The other five follow as a two-column grid.
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
            <h2 id="projects-heading" className="m-0 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1] tracking-[-0.03em]">
              <span className="mask-line">
                <Reveal as="span" variant="line">
                  {t(ui.projects.heading)}
                </Reveal>
              </span>
            </h2>
            <Reveal as="p" variant="rise" delay={80} className="mt-4 max-w-[58ch] text-[clamp(1rem,1.2vw,1.125rem)] leading-[1.5] text-fg-muted">
              {t(ui.projects.lede)}
            </Reveal>
          </div>

          <motion.ul
            ref={trackRef}
            className="gallery-track mt-[clamp(1.75rem,3.5vw,3rem)]"
            style={pinned ? { x } : undefined}
            onFocus={onFocus}
          >
            {FEATURED.map((p, i) => (
              <FeaturedCard key={p.slug} project={p} index={i} />
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

      {/* The other five: a two-column grid of compact posters */}
      <div className="container-x pb-[clamp(4rem,8vw,7rem)] pt-[clamp(3rem,6vw,5rem)]">
        <ul className="m-0 grid list-none gap-6 p-0 md:grid-cols-2 md:gap-8">
          {OTHERS.map((p, i) => (
            <GridCard key={p.slug} project={p} index={i} />
          ))}
        </ul>
        <p className="mt-10 max-w-none">
          <a href="https://github.com/ducnolag" target="_blank" rel="noopener noreferrer" className="link-arrow text-[1.0625rem]">
            {t(ui.projects.more)}
            <Icon name="arrow-up-right" size={18} />
          </a>
        </p>
      </div>
    </section>
  );
}
