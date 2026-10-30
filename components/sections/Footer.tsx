"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/lib/content";
import { Icon } from "@/components/ui/Icon";
import { LangToggle } from "@/components/ui/LangToggle";
import { MotionToggle } from "@/components/ui/MotionToggle";

/**
 * Curtain footer. The sheet is `position: fixed; bottom: 0` inside a clipped
 * box (`clip-path: inset(0)`) that sits in flow at the end of the document
 * and takes the sheet's measured height, so the page slides up and uncovers
 * it. The clip, not z-order, keeps it hidden behind the transparent hero and
 * portrait sections where the WebGL world shows through.
 */
export function Footer() {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    // ResizeObserver reports the initial size on observe, so no sync read is needed.
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <footer className="curtain ground-ink min-h-[14rem]" style={{ height }}>
      <div ref={sheetRef} className="curtain-inner ground-ink">
        <div className="container-x flex flex-col gap-8 py-12 md:flex-row md:items-end md:justify-between md:py-14">
          <div>
            <p className="m-0 max-w-none font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1] tracking-[-0.03em]">
              {profile.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
            <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[0.9375rem]">
              <li>
                <a href={profile.links.github} target="_blank" rel="noopener noreferrer" className="link-arrow">
                  <Icon name="github" size={18} />
                  GitHub
                </a>
              </li>
              <li>
                <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" className="link-arrow">
                  <Icon name="linkedin" size={18} />
                  LinkedIn
                </a>
              </li>
              <li>
                <a href={`mailto:${profile.email}`} className="link-arrow">
                  <Icon name="mail" size={18} />
                  {profile.email}
                </a>
              </li>
            </ul>
            <MotionToggle />
            <LangToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
