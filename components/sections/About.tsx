"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { profile, ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/hooks";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

/** One word of the statement: 45% → 100% cream as its line passes the middle of the screen. */
function Word({ progress, i, n, children }: { progress: MotionValue<number>; i: number; n: number; children: string }) {
  const start = i / n;
  const end = Math.min(1, start + 1.6 / n);
  const opacity = useTransform(progress, [start, end], [0.45, 1]);
  return (
    <>
      <motion.span style={{ opacity }}>{children}</motion.span>{" "}
    </>
  );
}

/**
 * Ink fill: the statement is readable at 45% before it fills; the fill only
 * sets the pace. Scroll-linked (useScroll on the paragraph, from its top at
 * 85% of the viewport to its bottom at 45%), linear, once per page.
 */
function Statement({ text, reduced }: { text: string; reduced: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(/\s+/);
  const cls =
    "m-0 max-w-[22ch] text-[clamp(1.875rem,3.6vw,3.25rem)] font-medium leading-[1.12] tracking-[-0.025em] text-fg";
  if (reduced) {
    return (
      <p ref={ref} className={cls}>
        {text}
      </p>
    );
  }
  return (
    <p ref={ref} className={cls}>
      {words.map((w, i) => (
        <Word key={`${i}-${w}`} progress={scrollYProgress} i={i} n={words.length}>
          {w}
        </Word>
      ))}
    </p>
  );
}

/** Event photographs, in gallery order (presenting, then hackathon). */
const EVENTS = [profile.photos.presenting, profile.photos.hackathon] as const;

export function About() {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  /* Prints on a wall: the large one drifts ±6% through the section, the small one half that. */
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const yLarge = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const ySmall = useTransform(scrollYProgress, [0, 1], ["-3%", "3%"]);

  const intro = t(profile.intro);
  const facts = t(ui.about.facts);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="ground-ink-2 relative scroll-mt-16 py-[clamp(6rem,12vw,11rem)]"
      aria-labelledby="about-heading"
    >
      <div className="container-x">
        {/* Row 1: heading on the left third, statement on the right two-thirds */}
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <h2
            id="about-heading"
            className="m-0 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1] tracking-[-0.03em] lg:col-span-4"
          >
            <span className="mask-line">
              <Reveal as="span" variant="line">
                {t(ui.about.heading)}
              </Reveal>
            </span>
          </h2>
          <div className="lg:col-span-8">
            <Statement text={t(ui.about.statement)} reduced={reduced} />
          </div>
        </div>

        {/* Row 2: prints on the left, the words on the right */}
        <div className="mt-[clamp(4rem,9vw,8rem)] grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="relative lg:col-span-5">
            <div className="relative mr-[18%] aspect-[4/5] overflow-clip rounded-[var(--radius-s)]">
              <motion.div className="absolute -inset-y-[7%] inset-x-0" style={reduced ? undefined : { y: yLarge }}>
                <Reveal variant="settle" className="relative h-full w-full">
                  <Image
                    src={profile.photos.mirror.src}
                    alt={t(profile.photos.mirror.alt)}
                    fill
                    sizes="(min-width: 2000px) 800px, (min-width: 1024px) 38vw, 82vw"
                    className="object-cover"
                  />
                </Reveal>
              </motion.div>
            </div>
            <motion.div
              className="absolute bottom-[-8%] right-0 w-[34%] max-w-[200px]"
              style={reduced ? undefined : { y: ySmall }}
            >
              <Reveal variant="mask" delay={80} className="relative aspect-square overflow-clip rounded-[var(--radius-s)]">
                {/* 200px source, 11 KB: serve as-is (the optimizer rejects widths below its size table in dev). */}
                <Image
                  src={profile.photos.campus.src}
                  alt={t(profile.photos.campus.alt)}
                  fill
                  sizes="200px"
                  unoptimized
                  className="object-cover"
                />
              </Reveal>
            </motion.div>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <div className="max-w-[60ch] space-y-5 text-[clamp(1.0625rem,1.2vw,1.1875rem)] leading-[1.6] text-fg">
              {intro.map((para, i) => (
                <Reveal as="p" key={para.slice(0, 24)} variant="rise" delay={i * 80} className="m-0 max-w-none">
                  {para}
                </Reveal>
              ))}
            </div>

            <Reveal as="p" variant="fade" delay={240} className="mt-10 max-w-none text-[1.0625rem] font-medium leading-relaxed text-orchid">
              {facts.map((f, i) => (
                <span key={f}>
                  {i > 0 && <span aria-hidden className="mx-3 text-fg-muted">·</span>}
                  {f}
                </span>
              ))}
            </Reveal>

            <Reveal as="ul" variant="fade" delay={320} className="m-0 mt-6 flex list-none flex-wrap gap-x-7 gap-y-3 p-0">
              <li>
                <a href={profile.links.github} target="_blank" rel="noopener noreferrer" className="link-arrow">
                  <Icon name="github" size={20} />
                  GitHub
                  <Icon name="arrow-up-right" size={16} />
                </a>
              </li>
              <li>
                <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" className="link-arrow">
                  <Icon name="linkedin" size={20} />
                  LinkedIn
                  <Icon name="arrow-up-right" size={16} />
                </a>
              </li>
            </Reveal>
          </div>
        </div>

        {/* Row 3: the two event prints (their only appearance on the page), captions name the events */}
        <ul className="m-0 mt-[clamp(3rem,7vw,6rem)] grid list-none gap-6 p-0 md:grid-cols-2 md:gap-8">
          {EVENTS.map((photo, i) => (
            <li key={photo.src}>
              <figure className="m-0">
                <div className="relative h-[clamp(220px,30vw,320px)] overflow-clip rounded-[16px] border border-line">
                  <div className="absolute inset-0">
                    <Reveal variant="settle" delay={i * 80} className="relative h-full w-full">
                      <Image
                        src={photo.src}
                        alt={t(photo.alt)}
                        fill
                        sizes="(min-width: 1800px) 900px, (min-width: 768px) 46vw, 92vw"
                        className="object-cover"
                      />
                    </Reveal>
                  </div>
                </div>
                <figcaption className="mt-3 text-[0.875rem] leading-snug text-fg-muted">{t(photo.caption)}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
