"use client";

import Image from "next/image";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { guideState, requestHop, setGuideAnchor, type GuideFace } from "@/lib/guide";
import { profile, ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/hooks";

/**
 * Particle portrait stage. The section is four screens tall with a sticky,
 * transparent, pointer-transparent stage: the WebGL points (Agent A's
 * PortraitParticles, reading `heldProgress` of this `[data-scene]`) show
 * through. Progress here is `useScroll` on the section with offset
 * ["start start", "end end"]; line i of `ui.scenes.portrait` is shown while
 * progress is in [i/3, (i+1)/3), crossfading in 300ms.
 * Reduced motion: the still photograph, full-bleed, with the three lines stacked.
 */
/** Lag's face per held third: watching the scatter, thinking as it resolves, happy as it flies away. */
const FACE_BY_THIRD: GuideFace[] = ["searching", "thinking", "happy"];

export function ScenePortrait() {
  const { t } = useLang();
  const reduced = useReducedMotion();
  const lines = t(ui.scenes.portrait);
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const captionRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(lines.length - 1, Math.max(0, Math.floor(v * lines.length)));
    if (i !== activeRef.current) {
      activeRef.current = i;
      setActive(i);
      if (guideState.owner === "portrait") {
        guideState.face = FACE_BY_THIRD[i] ?? "happy";
        requestHop();
      }
    }
  });

  /* Lag watches from the right of the caption block while the scene is on screen */
  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    let on = false;
    let raf = 0;
    const place = () => {
      raf = 0;
      if (on) setGuideAnchor(captionRef.current, "right");
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        on = e.isIntersecting;
        if (on) {
          guideState.owner = "portrait";
          guideState.face = FACE_BY_THIRD[activeRef.current] ?? "searching";
          guideState.talking = false;
          schedule();
        } else if (guideState.owner === "portrait") {
          guideState.owner = null;
        }
      },
      { rootMargin: "-10% 0px -10% 0px" },
    );
    io.observe(section);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
      if (guideState.owner === "portrait") guideState.owner = null;
    };
  }, []);

  const label = lines.join(" ");

  if (reduced) {
    return (
      <section ref={ref} data-scene="portrait" className="relative" aria-label={label}>
        <figure className="relative m-0 min-h-[100svh] overflow-clip">
          <Image src={profile.photos.sunset.src} alt={t(profile.photos.sunset.alt)} fill sizes="100vw" className="object-cover" />
          <figcaption className="relative flex min-h-[100svh] items-end bg-gradient-to-t from-ink/85 via-ink/30 to-transparent">
            <div className="container-x pb-[clamp(3rem,8vh,5rem)] pt-40">
              {lines.map((l) => (
                <p key={l} className="m-0 max-w-[28ch] text-[clamp(1.375rem,2.6vw,2.25rem)] font-medium leading-[1.2] tracking-[-0.015em] text-fg [&+&]:mt-3">
                  {l}
                </p>
              ))}
            </div>
          </figcaption>
        </figure>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      data-scene="portrait"
      className="pointer-events-none relative h-[400svh]"
      aria-label={label}
    >
      <div className="sticky top-0 flex h-[100svh] items-end">
        {/* flat-to-clear scrim under the text only */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-ink/75 to-transparent" />
        <div className="container-x relative pb-[clamp(3rem,8vh,5rem)]">
          <p className="sr-only">{label}</p>
          <div ref={captionRef} aria-hidden className="relative h-[2.6em] max-w-[28ch] text-[clamp(1.375rem,2.6vw,2.25rem)] font-medium leading-[1.2] tracking-[-0.015em] lg:max-w-[60%]">
            {lines.map((l, i) => (
              <p
                key={l}
                className="absolute inset-x-0 bottom-0 m-0 max-w-none text-fg transition-opacity duration-300 ease-out"
                style={{ opacity: i === active ? 1 : 0 }}
              >
                {l}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
