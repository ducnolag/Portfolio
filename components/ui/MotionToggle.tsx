"use client";

import { ui } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { setMotionPreference, useMotionPreference } from "@/lib/hooks";

/**
 * In-site motion switch. Motion is on by default (the OS query is ignored);
 * pressing stores `portfolio.motion = "reduce"` and flips
 * `<html data-motion>` at once, so Lenis unmounts, reveals show their
 * finished state and the WebGL world settles without a reload.
 * `aria-pressed` reflects "reduced"; the visible label names the action.
 */
export function MotionToggle({ className = "" }: { className?: string }) {
  const { t } = useLang();
  const reduced = useMotionPreference() === "reduce";

  return (
    <button
      type="button"
      className={`motion-toggle ${className}`}
      aria-pressed={reduced}
      onClick={() => setMotionPreference(reduced ? "full" : "reduce")}
    >
      {/* pulse / waveform glyph, 1.5px round stroke; flat when motion is reduced */}
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
        {reduced ? (
          <path d="M3 12h18" />
        ) : (
          <path d="M3 12h3.5l2.5-6 4 12 2.5-6H21" />
        )}
      </svg>
      {t(reduced ? ui.a11y.enableMotion : ui.a11y.reduceMotion)}
    </button>
  );
}
