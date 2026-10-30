"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { profile, resume, ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/hooks";
import { guideState, setGuideAnchor } from "@/lib/guide";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

/** One skill line: fills from 45% to full as it rises through the viewport. */
function Line({ text, reduced }: { text: string; reduced: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 92%", "start 58%"] });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.45, 1]);
  return (
    <motion.li ref={ref} className="flex gap-3 text-[1.0625rem] leading-[1.5] text-fg" style={reduced ? undefined : { opacity }}>
      <span aria-hidden className="mt-[0.75em] h-px w-3 shrink-0 bg-orchid" />
      {text}
    </motion.li>
  );
}

/**
 * Skills only (section id stays `skills`): the four CV skill groups as a
 * compact two-column list. Group names slide in from the left, lines ink-fill
 * as they rise. Lag docks top-right of the heading (owner "skills",
 * face "listening") while the section is on screen.
 */
export function Skills() {
  const { t, lang } = useLang();
  const reduced = useReducedMotion();
  const serif = lang === "en";
  const sectionRef = useRef<HTMLElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let on = false;
    let raf = 0;
    const place = () => {
      raf = 0;
      if (on) setGuideAnchor(bubbleRef.current, "right");
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        on = e.isIntersecting;
        if (on) {
          guideState.owner = "skills";
          guideState.face = "listening";
          guideState.talking = false;
          schedule();
        } else if (guideState.owner === "skills") {
          guideState.owner = null;
        }
      },
      { rootMargin: "-20% 0px -20% 0px" },
    );
    io.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
      if (guideState.owner === "skills") guideState.owner = null;
    };
  }, []);

  const groupCls = serif ? "font-serif text-[1.5rem] italic leading-snug text-orchid" : "text-[1.125rem] font-medium leading-snug text-orchid";

  return (
    <section id="skills" ref={sectionRef} className="ground-ink-2 scroll-mt-16 py-[clamp(5rem,8vw,7rem)]" aria-labelledby="skills-heading">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 id="skills-heading" className="m-0 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1] tracking-[-0.03em]">
              <span className="mask-line">
                <Reveal as="span" variant="line">
                  {t(ui.skills.heading)}
                </Reveal>
              </span>
            </h2>
            <Reveal as="p" variant="rise" delay={80} className="mt-4 max-w-[44ch] text-[clamp(1rem,1.2vw,1.125rem)] leading-[1.5] text-fg-muted">
              {t(ui.skills.lede)}
            </Reveal>
          </div>
          {/* Lag's line, top-right; the 3D guide docks to its right */}
          <Reveal variant="pop" delay={160} className="lg:col-span-4 lg:col-start-7">
            <div ref={bubbleRef} className="bubble bubble-right">
              <p className="m-0 max-w-none text-[1.0625rem] leading-[1.45] text-fg">{t(ui.skills.lagSays)}</p>
            </div>
          </Reveal>
        </div>

        <dl className="m-0 mt-12 border-t border-line">
          {resume.skillGroups.map((g, gi) => (
            <div key={g.group.en} className="grid gap-3 border-b border-line py-6 md:grid-cols-10 md:gap-8">
              <Reveal as="div" variant="slide" delay={gi * 70} className="md:col-span-3">
                <dt className={groupCls}>{t(g.group)}</dt>
              </Reveal>
              <dd className="m-0 md:col-span-7">
                <ul className="m-0 list-none space-y-2 p-0">
                  {t(g.items).map((item) => (
                    <Line key={item} text={item} reduced={reduced} />
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>

        <Reveal variant="fade" delay={80} className="mt-10">
          <a href={profile.cv.href} download={profile.cv.filename} className="btn btn-ghost">
            <Icon name="download" size={18} />
            {t(ui.skills.downloadCv)}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
