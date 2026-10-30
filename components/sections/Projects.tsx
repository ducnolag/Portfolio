"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { RobotHead, type RobotHeadState } from "robot-heads";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { projects, ui, type Project } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/hooks";
import { guideState, requestHop, setGuideAnchor, type GuideFace } from "@/lib/guide";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { useTypewriter, type TypeMode } from "@/components/ui/useTypewriter";

const FACE_BY_CATEGORY: Record<Project["category"], GuideFace> = {
  ai: "thinking",
  data: "working",
  web: "happy",
  mobile: "listening",
  system: "searching",
};
const ROBOT_FACE: Record<GuideFace, RobotHeadState> = {
  idle: "idle",
  thinking: "thinking",
  searching: "searching",
  listening: "listening",
  speaking: "speaking",
  working: "working",
  happy: "happy",
  error: "error",
  sleeping: "sleeping",
};

const accentVar = (p: Project) => `var(--${p.accent})`;

const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

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
      const tiles: ReactNode[] = [];
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 7; c++)
          tiles.push(
            <rect key={`${r}-${c}`} x={60 + c * 160} y={70 + r * 160} width={120} height={120} rx={26} opacity={0.22 + ((r * 7 + c) % 5) * 0.08} />,
          );
      return <g fill="currentColor">{tiles}</g>;
    }
    case "misher":
      return (
        <g fill="none" stroke="currentColor" strokeWidth={12} strokeLinecap="round">
          {[90, 200, 310, 420, 530, 640, 750, 860, 970].map((r, i) => (
            <circle key={r} cx={150} cy={640} r={r} opacity={0.6 - i * 0.055} />
          ))}
        </g>
      );
    case "lab-manager": {
      const seats: ReactNode[] = [];
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 12; c++) {
          const x = 90 + c * 86 + (c >= 6 ? 60 : 0);
          seats.push(<rect key={`${r}-${c}`} x={x} y={120 + r * 92} width={56} height={56} rx={10} opacity={(r + c) % 4 === 0 ? 0.6 : 0.22} />);
        }
      return <g fill="currentColor">{seats}</g>;
    }
    case "data-to-decision": {
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

export function GeneratedCover({ project: p }: { project: Project }) {
  return (
    <div className="absolute inset-0 bg-ink-3" style={{ color: accentVar(p) }} aria-hidden>
      <svg viewBox="0 0 1200 750" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <Pattern slug={p.slug} />
      </svg>
      <span className="font-condensed absolute bottom-[4%] left-[6%] text-[2rem] font-extrabold leading-none tracking-[-0.04em]" style={{ color: accentVar(p) }}>
        {initialsOf(p.title)}
      </span>
    </div>
  );
}

/** 160×100 thumbnail with a ±4% scroll drift inside its frame. */
function Thumb({ project: p }: { project: Project }) {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);
  return (
    <div ref={ref} className="relative h-[120px] w-full shrink-0 overflow-clip rounded-[10px] bg-ink-3 sm:h-[100px] sm:w-[160px]">
      <motion.div className="absolute -inset-y-[6%] inset-x-0" style={reduced ? undefined : { y }}>
        {p.cover ? (
          <Image src={p.cover} alt={`${t(ui.projects.coverAlt)} ${p.title}`} fill sizes="(min-width: 640px) 160px, 80vw" className="object-cover object-top" />
        ) : (
          <GeneratedCover project={p} />
        )}
      </motion.div>
    </div>
  );
}

/** Lag's speech bubble: types in when active, caret while typing, full text for SSR / reduced. */
function Bubble({
  text,
  mode,
  active,
  reduced,
  onTypingChange,
  bubbleRef,
  face,
  showAvatar,
}: {
  text: string;
  mode: TypeMode;
  active: boolean;
  reduced: boolean;
  onTypingChange: (typing: boolean) => void;
  bubbleRef: (el: HTMLDivElement | null) => void;
  face: GuideFace;
  showAvatar: boolean;
}) {
  const mounted = useMounted();
  const { shown, phase } = useTypewriter(text, mode, 18, reduced, () => onTypingChange(false));
  useEffect(() => {
    if (phase === "typing") onTypingChange(true);
  }, [phase, onTypingChange]);
  return (
    <div className="relative">
      {showAvatar && mounted && (
        <span className={`thread-avatar ${active ? "is-on" : ""}`} aria-hidden>
          <RobotHead size={56} state={active ? ROBOT_FACE[face] : "idle"} interactive={false} antenna={false} color="#7c3aed" trimColor="#9c92c4" screenColor="#efeafc" />
        </span>
      )}
      <Reveal variant="pop" className="bubble">
        <div ref={bubbleRef} data-typing={phase} className="bubble-text">
          <p className="m-0 max-w-none text-[1.125rem] leading-[1.45] text-fg">
            {shown}
            {phase === "typing" && <span className="caret" aria-hidden />}
          </p>
        </div>
      </Reveal>
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

function Links({ project: p }: { project: Project }) {
  const { t } = useLang();
  const demoLabel =
    p.demoKind === "ui-only" ? ui.projects.viewUiOnly : p.demoKind === "build" ? ui.projects.viewBuild : ui.projects.viewDemo;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[0.9375rem]">
      {p.demo && (
        <li>
          <a href={p.demo} target="_blank" rel="noopener noreferrer" className="link-arrow">
            {t(demoLabel)}
            <Icon name="arrow-up-right" size={15} />
          </a>
        </li>
      )}
      {p.repo && (
        <li>
          <a href={p.repo} target="_blank" rel="noopener noreferrer" className="link-arrow">
            <Icon name="github" size={16} />
            {t(ui.projects.viewRepo)}
            <Icon name="arrow-up-right" size={15} />
          </a>
        </li>
      )}
    </ul>
  );
}

function Card({ project: p }: { project: Project }) {
  const { t } = useLang();
  const primary = p.demo ?? p.repo;
  return (
    <Reveal variant="rise" delay={120} className="mt-4">
      <article className="tcard relative flex flex-col gap-4 overflow-clip rounded-[var(--radius-m)] bg-ink-2 p-4 sm:flex-row sm:gap-5 sm:p-5" style={{ "--accent": accentVar(p) } as CSSProperties}>
        <span aria-hidden className="tcard-edge absolute inset-y-0 left-0 w-px bg-[var(--accent)]" />
        <Thumb project={p} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="m-0 text-[1.5rem] font-semibold leading-[1.1] tracking-[-0.02em]">
            {primary ? (
              <a href={primary} target="_blank" rel="noopener noreferrer" className="no-underline transition-colors duration-200 hover:text-[var(--accent)]">
                {p.title}
              </a>
            ) : (
              p.title
            )}
          </h3>
          <p className="m-0 max-w-[44ch] text-[1rem] leading-[1.45] text-fg">{t(p.tagline)}</p>
          {p.role && <p className="m-0 max-w-none text-[0.875rem] text-orchid">{t(p.role)}</p>}
          <p className="m-0 max-w-none text-[0.875rem] text-fg-muted tabular-nums">
            {p.year} · {p.stack.join(" · ")}
          </p>
          <div className="mt-1 flex flex-col gap-2.5">
            <Tags project={p} />
            <Links project={p} />
          </div>
        </div>
      </article>
    </Reveal>
  );
}

type EntryData = { key: string; text: string; face: GuideFace; project?: Project };
/** Faces per entry index: intro, the projects by category, outro. Language-independent. */
const FACES: GuideFace[] = ["speaking", ...projects.map((p) => FACE_BY_CATEGORY[p.category]), "speaking"];

/**
 * Selected work, told by Lag as a dialogue thread: an intro bubble, one
 * bubble + compact card per project, an outro bubble. The entry whose bubble
 * is nearest 40% of the viewport is active: its text types in, and the DOM
 * writes guideState (owner, activeIndex, anchor on the bubble's left, face
 * by category, talking while typing) plus a hop request so the 3D Lag moves
 * to it. Desktop: Lag's empty lane on the left third, thread right of centre.
 * Phone: full-width thread with a 72px gutter and a 2D RobotHead avatar.
 */
export function Projects() {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const threadRef = useRef<HTMLOListElement>(null);
  const bubbles = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(-1);
  const activeRef = useRef(-1);
  const onScreen = useRef(false);

  const entries: EntryData[] = [
    { key: "intro", text: t(ui.projects.intro), face: "speaking" },
    ...projects.map((p) => ({ key: p.slug, text: t(p.lagSays), face: FACE_BY_CATEGORY[p.category], project: p })),
    { key: "outro", text: t(ui.projects.outro), face: "speaking" },
  ];

  /* The thread line draws itself as the reader goes down */
  const { scrollYProgress } = useScroll({ target: threadRef, offset: ["start 60%", "end 60%"] });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  /* Active entry = bubble nearest 40% of the viewport; recomputed on scroll via rAF */
  useEffect(() => {
    let raf = 0;
    const pick = () => {
      raf = 0;
      if (!onScreen.current) return;
      const target = window.innerHeight * 0.4;
      let best = -1;
      let bestD = Infinity;
      bubbles.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - target);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best !== -1) setGuideAnchor(bubbles.current[best], "left");
      if (best !== activeRef.current) {
        activeRef.current = best;
        setActive(best);
        guideState.activeIndex = best;
        guideState.face = FACES[best] ?? "speaking";
        requestHop();
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    const section = sectionRef.current;
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen.current = e.isIntersecting;
        if (e.isIntersecting) {
          guideState.owner = "projects";
          schedule();
        } else if (guideState.owner === "projects") {
          guideState.owner = null;
          guideState.talking = false;
        }
      },
      { rootMargin: "-10% 0px -10% 0px" },
    );
    if (section) io.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
      if (guideState.owner === "projects") guideState.owner = null;
    };
  }, []);

  const onTypingChange = useCallback((typing: boolean) => {
    guideState.talking = typing;
  }, []);

  return (
    <section id="projects" ref={sectionRef} className="ground-ink scroll-mt-16 py-[clamp(5rem,9vw,8rem)]" aria-labelledby="projects-heading">
      <div className="container-x">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Lag's lane: empty on purpose, the 3D guide lives here on wide screens */}
          <div aria-hidden className="hidden lg:col-span-4 lg:block" />

          <div className="lg:col-span-8">
            <h2 id="projects-heading" className="m-0 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1] tracking-[-0.03em]">
              <span className="mask-line">
                <Reveal as="span" variant="line">
                  {t(ui.projects.heading)}
                </Reveal>
              </span>
            </h2>
            <Reveal as="p" variant="rise" delay={80} className="mt-4 max-w-[52ch] text-[clamp(1rem,1.2vw,1.125rem)] leading-[1.5] text-fg-muted">
              {t(ui.projects.lede)}
            </Reveal>

            <div className="thread relative mt-10 max-w-[720px] pl-[72px] lg:pl-10">
              {/* The thread line, drawn by the scroll */}
              <svg aria-hidden className="pointer-events-none absolute bottom-0 left-[27px] top-0 h-full w-[2px] overflow-visible lg:left-[11px]" preserveAspectRatio="none" viewBox="0 0 2 100">
                <line x1="1" y1="0" x2="1" y2="100" stroke="var(--line-strong)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <motion.line x1="1" y1="0" x2="1" y2="100" stroke="var(--orchid)" strokeWidth="2" vectorEffect="non-scaling-stroke" style={reduced ? undefined : { pathLength }} pathLength={1} />
              </svg>

              <ol ref={threadRef} className="m-0 list-none space-y-10 p-0">
                {entries.map((e, i) => (
                  <li key={e.key} className="relative" data-active={i === active ? "" : undefined}>
                    <span aria-hidden className={`thread-dot ${i === active ? "is-on" : ""}`} />
                    <p className="sr-only">{t(ui.projects.lagName)}</p>
                    <Bubble
                      text={e.text}
                      mode={i === active ? "type" : active > i ? "instant" : "pending"}
                      active={i === active}
                      reduced={reduced}
                      onTypingChange={onTypingChange}
                      bubbleRef={(el) => {
                        bubbles.current[i] = el;
                      }}
                      face={e.face}
                      showAvatar
                    />
                    {e.project && <Card project={e.project} />}
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-10 max-w-none">
              <a href="https://github.com/ducnolag" target="_blank" rel="noopener noreferrer" className="link-arrow text-[1.0625rem]">
                {t(ui.projects.more)}
                <Icon name="arrow-up-right" size={18} />
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
