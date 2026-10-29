"use client";

import { useSyncExternalStore } from "react";

/* ─────────────────────────────────────────────────────────────
   Motion preference
   The site is motion-first: full motion is the default even when the OS
   reports prefers-reduced-motion (many Windows machines have "animation
   effects" off without the user knowing). A visible in-site switch lets
   anyone reduce motion; the choice is stored and applied to <html data-motion>
   by an inline script in app/layout.tsx before first paint.
   ───────────────────────────────────────────────────────────── */
export type MotionPref = "full" | "reduce";
export const MOTION_KEY = "portfolio.motion";

const motionListeners = new Set<() => void>();
let motionCache: MotionPref | null = null;

function readMotion(): MotionPref {
  if (motionCache) return motionCache;
  let v: MotionPref = "full";
  try {
    const saved = localStorage.getItem(MOTION_KEY);
    if (saved === "reduce" || saved === "full") v = saved;
  } catch {}
  motionCache = v;
  return v;
}

export function setMotionPreference(v: MotionPref) {
  motionCache = v;
  try {
    localStorage.setItem(MOTION_KEY, v);
  } catch {}
  document.documentElement.dataset.motion = v;
  motionListeners.forEach((fn) => fn());
}

function subscribeMotion(fn: () => void) {
  motionListeners.add(fn);
  return () => {
    motionListeners.delete(fn);
  };
}

/** The user's in-site motion choice. Server snapshot = "full". */
export function useMotionPreference(): MotionPref {
  return useSyncExternalStore(subscribeMotion, readMotion, () => "full");
}

/** True when motion should be reduced (in-site switch). SSR-safe (false). */
export function useReducedMotion() {
  return useMotionPreference() === "reduce";
}

/** Subscribe helper for a media query; snapshot = matches. */
function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True when the OS itself asks for reduced motion (informational only). */
export function useOsReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** True on coarse-pointer (touch) devices. SSR-safe (false on server). */
export function useIsTouch() {
  return useMediaQuery("(pointer: coarse)");
}

export type DeviceTier = 0 | 1 | 2;

let cachedTier: DeviceTier | null = null;

/** Computed once per page load; cheap heuristics only. */
function readTier(): DeviceTier {
  if (cachedTier !== null) return cachedTier;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (coarse && (cores <= 4 || mem <= 4)) cachedTier = 0;
  else if (coarse || cores <= 4 || mem <= 4) cachedTier = 1;
  else cachedTier = 2;
  return cachedTier;
}

const noopSubscribe = () => () => {};

/**
 * Rough GPU/device tier for scaling 3D quality.
 * 0 = low (weak mobile), 1 = mid, 2 = high. Server snapshot = 1.
 */
export function useDeviceTier(): DeviceTier {
  return useSyncExternalStore(noopSubscribe, readTier, () => 1);
}
