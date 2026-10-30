"use client";

import { useEffect, useRef, useState } from "react";
import { profile, resume, ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/hooks";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

const STEP = 70;

/** Counts 0 → value once in view (1.1s, expo-out, tabular). Static under reduced motion. */
function RollingFigure({ value, decimals, reduced }: { value: number; decimals: number; reduced: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    let raf = 0;
    if (!el || !("IntersectionObserver" in window)) {
      raf = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1100;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(2, -10 * t);
          setShown(value * (t >= 1 ? 1 : eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, reduced]);

  const display = reduced ? value : shown;
  return (
    <span ref={ref} className="tabular-nums">
      <span className="sr-only">{value.toFixed(decimals)}</span>
      <span aria-hidden>{display.toFixed(decimals)}</span>
    </span>
  );
}

function Rule() {
  return <span aria-hidden className="block h-px w-full bg-[var(--line)]" />;
}

/**
 * Résumé (section id stays `skills`). Two editorial columns on desktop:
 * education and experience on the left; skill groups, certificates and
 * awards on the right. Type hierarchy and hairlines, no cards. Rows rise
 * 70ms apart once; the GPA rolls up once.
 */
export function Skills() {
  const { t, lang } = useLang();
  const reduced = useReducedMotion();
  const serif = lang === "en";
  const groupCls = serif ? "font-serif text-[1.5rem] italic text-orchid" : "text-[1.125rem] font-medium text-orchid";
  const [gpaValue, gpaScale] = resume.education.gpa.split(" / ");
  const gpaNumber = parseFloat(gpaValue);

  return (
    <section id="skills" className="ground-ink-2 scroll-mt-16 py-[clamp(6rem,12vw,11rem)]" aria-labelledby="skills-heading">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 id="skills-heading" className="m-0 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1] tracking-[-0.03em]">
            <span className="mask-line">
              <Reveal as="span" variant="line">
                {t(ui.skills.heading)}
              </Reveal>
            </span>
          </h2>
          <Reveal as="p" variant="fade" delay={STEP} className={`m-0 max-w-none ${serif ? "font-serif text-[1.5rem] italic" : "text-[1.125rem] font-medium"} text-orchid`}>
            {t(resume.headline)}
          </Reveal>
        </div>

        <div className="mt-14 grid gap-14 lg:grid-cols-12 lg:gap-12">
          {/* Left: education + experience */}
          <div className="lg:col-span-5">
            <Reveal variant="rise" delay={0} className="border-t border-line pt-6">
              <h3 className="m-0 text-[0.9375rem] font-medium text-fg-muted">{t(ui.skills.education)}</h3>
              <p className="mt-4 max-w-none text-[clamp(1.375rem,2vw,1.75rem)] font-semibold leading-[1.15] tracking-[-0.02em]">{t(resume.education.school)}</p>
              <p className="mt-2 max-w-none text-[1.0625rem] leading-[1.5] text-fg">{t(resume.education.degree)}</p>
              <p className="mt-1 max-w-none text-[1rem] leading-[1.5] text-fg-muted">{t(resume.education.faculty)}</p>
              <div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-2">
                <p className="m-0 max-w-none text-[1rem] text-fg-muted tabular-nums">{resume.education.period}</p>
                <p className="m-0 flex max-w-none items-baseline gap-2">
                  <span className="text-[0.9375rem] text-fg-muted">{t(ui.skills.gpa)}</span>
                  <span className="text-[clamp(1.75rem,2.6vw,2.5rem)] font-semibold leading-none tracking-[-0.02em]">
                    <RollingFigure value={gpaNumber} decimals={2} reduced={reduced} />
                  </span>
                  <span className="text-[1rem] text-fg-muted tabular-nums">/ {gpaScale}</span>
                </p>
              </div>
            </Reveal>

            <Reveal variant="rise" delay={STEP} className="mt-12 border-t border-line pt-6">
              <h3 className="m-0 text-[0.9375rem] font-medium text-fg-muted">{t(ui.skills.experience)}</h3>
              <ul className="m-0 list-none p-0">
                {resume.experience.map((job) => (
                  <li key={job.company} className="mt-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <p className="m-0 max-w-none text-[clamp(1.25rem,1.8vw,1.5rem)] font-semibold leading-[1.2] tracking-[-0.02em]">{job.company}</p>
                      <p className="m-0 max-w-none text-[1rem] text-fg-muted tabular-nums">{job.period}</p>
                    </div>
                    <p className="mt-1 max-w-none text-[1.0625rem] text-orchid">{t(job.role)}</p>
                    <p className="mt-3 max-w-[52ch] text-[1.0625rem] leading-[1.55] text-fg">{t(job.summary)}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Right: skills, certificates, awards */}
          <div className="lg:col-span-6 lg:col-start-7">
            <Reveal variant="rise" delay={2 * STEP} className="border-t border-line pt-6">
              <h3 className="m-0 text-[0.9375rem] font-medium text-fg-muted">{t(ui.skills.skills)}</h3>
            </Reveal>
            <dl className="m-0">
              {resume.skillGroups.map((g, gi) => (
                <Reveal key={g.group.en} variant="rise" delay={(3 + gi) * STEP} className="grid gap-2 py-5 md:grid-cols-12 md:gap-6">
                  <dt className={`${groupCls} md:col-span-4`}>{t(g.group)}</dt>
                  <dd className="m-0 md:col-span-8">
                    <ul className="m-0 list-none space-y-2 p-0 text-[1rem] leading-[1.5] text-fg">
                      {t(g.items).map((item) => (
                        <li key={item} className="flex gap-3">
                          <span aria-hidden className="mt-[0.75em] h-px w-3 shrink-0 bg-orchid" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </dd>
                  {gi < resume.skillGroups.length - 1 && (
                    <div className="md:col-span-12">
                      <Rule />
                    </div>
                  )}
                </Reveal>
              ))}
            </dl>

            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <Reveal variant="rise" delay={7 * STEP} className="border-t border-line pt-6">
                <h3 className="m-0 text-[0.9375rem] font-medium text-fg-muted">{t(ui.skills.certificates)}</h3>
                <ul className="m-0 mt-4 list-none space-y-3 p-0">
                  {resume.certificates.map((c) => (
                    <li key={c.name.en} className="flex items-baseline justify-between gap-4 text-[1rem] leading-[1.4]">
                      <span className="text-fg">{t(c.name)}</span>
                      <span className="shrink-0 text-fg-muted tabular-nums">{c.year}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal variant="rise" delay={8 * STEP} className="border-t border-line pt-6">
                <h3 className="m-0 text-[0.9375rem] font-medium text-fg-muted">{t(ui.skills.awards)}</h3>
                <ul className="m-0 mt-4 list-none space-y-3 p-0">
                  {resume.awards.map((a) => (
                    <li key={a.name.en} className="flex items-baseline justify-between gap-4 text-[1rem] leading-[1.4]">
                      <span className="text-fg">{t(a.name)}</span>
                      <span className="shrink-0 text-fg-muted tabular-nums">{a.year}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </div>

        <Reveal variant="fade" delay={9 * STEP} className="mt-14">
          <a href={profile.cv.href} download={profile.cv.filename} className="btn btn-ghost">
            <Icon name="download" size={18} />
            {t(ui.skills.downloadCv)}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
