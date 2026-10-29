"use client";

import { skills, ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { Reveal } from "@/components/ui/Reveal";

/** Weights cycle so the flow reads as set type, not a tag cloud. */
const WEIGHTS = [700, 400, 500, 300, 600];

/**
 * Typographic toolbox: four rows, the group name in the serif voice on the
 * left (Bricolage for Vietnamese, which the serif cannot set), the tools as
 * large words flowing on the right. Rows arrive 70ms apart, once; a word
 * lights orchid under the hand. No cards.
 */
export function Skills() {
  const { t, lang } = useLang();
  const serif = lang === "en";

  return (
    <section id="skills" className="ground-ink-2 scroll-mt-16 py-[clamp(6rem,12vw,11rem)]" aria-labelledby="skills-heading">
      <div className="container-x">
        <h2 id="skills-heading" className="m-0 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1] tracking-[-0.03em]">
          <span className="mask-line">
            <Reveal as="span" variant="line">
              {t(ui.skills.heading)}
            </Reveal>
          </span>
        </h2>

        <dl className="m-0 mt-12 border-b border-line">
          {skills.map((group, gi) => (
            <Reveal
              key={group.group.en}
              variant="rise"
              delay={gi * 80}
              className="grid gap-3 border-t border-line py-7 md:grid-cols-12 md:gap-8 md:py-9"
            >
              <dt
                className={
                  serif
                    ? "font-serif text-[1.75rem] italic leading-snug text-orchid md:col-span-3 md:pt-1 lg:col-span-2"
                    : "text-[1.125rem] font-medium leading-snug text-orchid md:col-span-3 md:pt-2 lg:col-span-2"
                }
              >
                {t(group.group)}
              </dt>
              <dd className="m-0 md:col-span-9 lg:col-span-10">
                <ul className="m-0 flex list-none flex-wrap items-baseline gap-x-[0.55em] gap-y-1 p-0">
                  {group.items.map((item, ii) => (
                    <li
                      key={item}
                      className="tool-word text-[clamp(1.5rem,3.4vw,3rem)] leading-[1.15] tracking-[-0.02em]"
                      style={{ fontWeight: WEIGHTS[(ii + gi) % WEIGHTS.length] }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
