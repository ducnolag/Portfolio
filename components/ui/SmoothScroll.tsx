"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { useEffect, type ReactNode } from "react";
import { useIsTouch, useReducedMotion } from "@/lib/hooks";
import { installNativeScroll, writeScroll } from "@/lib/scroll";

/** Fixed nav height, so anchor jumps land below it (sections also carry scroll-mt). */
const ANCHOR_OFFSET = -72;

/** Writes the shared scroll state on every Lenis scroll event. */
function LenisWriter() {
  useLenis((lenis) => {
    writeScroll(lenis.scroll, lenis.limit);
  });
  return null;
}

/** Same state from a passive window listener when Lenis is off. */
function NativeWriter() {
  useEffect(() => installNativeScroll(), []);
  return null;
}

/**
 * Lenis smooth scroll on the window (lerp 0.1). Disabled for reduced motion
 * and for touch devices, where native momentum scrolling is the smooth path.
 * Either way `lib/scroll.ts` is kept current for the WebGL world.
 */
/** Lenis on the window; rendered as a childless sibling so toggling motion never remounts the page. */
function LenisRoot() {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        smoothWheel: true,
        anchors: { offset: ANCHOR_OFFSET },
      }}
    >
      <LenisWriter />
    </ReactLenis>
  );
}

/**
 * Lenis smooth scroll on the window (lerp 0.1). Disabled for touch devices
 * and when the in-site motion switch says "reduce" (it mounts/unmounts live).
 * Either way `lib/scroll.ts` is kept current for the WebGL world. The page
 * tree stays a stable sibling, so switching does not remount sections.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const touch = useIsTouch();
  const smooth = !reduced && !touch;

  return (
    <>
      {smooth ? <LenisRoot /> : <NativeWriter />}
      {children}
    </>
  );
}
