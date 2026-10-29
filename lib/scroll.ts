"use client";

/**
 * Shared scroll state, written once per frame by the smooth-scroll provider
 * (or a passive window listener as fallback) and read by anything that
 * animates with the scroll: the WebGL world, parallax, pinned scenes.
 *
 * It is a plain mutable object on purpose: reading it inside useFrame or a
 * rAF loop costs nothing and causes no React renders.
 */
export type ScrollState = {
  /** Current scroll position in px. */
  y: number;
  /** 0..1 over the whole document. */
  progress: number;
  /** px per frame, smoothed. Positive = scrolling down. */
  velocity: number;
  /** document.scrollHeight - innerHeight */
  limit: number;
  /** Viewport height. */
  vh: number;
};

export const scrollState: ScrollState = {
  y: 0,
  progress: 0,
  velocity: 0,
  limit: 1,
  vh: 1,
};

/** Called by the scroll provider (Lenis onScroll) or the fallback listener. */
export function writeScroll(y: number, limit?: number) {
  const vh = typeof window !== "undefined" ? window.innerHeight : 1;
  const lim =
    limit ??
    (typeof document !== "undefined"
      ? Math.max(1, document.documentElement.scrollHeight - vh)
      : 1);
  const dy = y - scrollState.y;
  scrollState.velocity = scrollState.velocity * 0.8 + dy * 0.2;
  scrollState.y = y;
  scrollState.limit = lim;
  scrollState.vh = vh;
  scrollState.progress = Math.min(1, Math.max(0, y / lim));
}

/**
 * 0..1 progress of an element through the viewport.
 * 0 = element top at viewport bottom, 1 = element bottom at viewport top.
 * Cheap enough to call every frame (one getBoundingClientRect).
 */
export function elementProgress(el: Element | null): number {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  const total = r.height + vh;
  return Math.min(1, Math.max(0, (vh - r.top) / total));
}

/**
 * Progress of a pinned/held scene: the section is (hold + 1) screens tall and
 * its sticky stage is held for `hold` screens. Returns 0..1 over the hold.
 */
export function heldProgress(section: Element | null): number {
  if (!section) return 0;
  const r = section.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  const travel = Math.max(1, r.height - vh);
  return Math.min(1, Math.max(0, -r.top / travel));
}

/**
 * Install a passive fallback listener when no smooth-scroll provider writes
 * the state (touch devices / reduced motion). Returns a cleanup.
 */
export function installNativeScroll() {
  const onScroll = () => writeScroll(window.scrollY);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}
