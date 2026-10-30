"use client";

/**
 * Shared state for "Lag", the robot guide, after the companion scene.
 * The DOM (sections) writes WHERE Lag should be and WHAT it should feel;
 * the WebGL world reads it every frame and animates the 3D robot there.
 * Plain mutable object, no React state: zero renders per frame.
 */
export type GuideFace =
  | "idle"
  | "thinking"
  | "searching"
  | "listening"
  | "speaking"
  | "working"
  | "happy"
  | "error"
  | "sleeping";

export type GuideAnchor = {
  /** Viewport-space rect (px) of the element Lag should sit next to. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Which side of the anchor Lag should occupy. */
  side: "left" | "right" | "above";
};

export type GuideState = {
  /** Section currently owning Lag: null = not docked (companion scene or none). */
  owner: null | "projects" | "skills" | "contact";
  anchor: GuideAnchor | null;
  face: GuideFace;
  /** Index of the active dialogue entry (projects), -1 when none. */
  activeIndex: number;
  /** Monotonic counter: bump to ask Lag for a hop (e.g. when the active entry changes). */
  hopRequest: number;
  /** True while a speech bubble is typing (Lag mouths along). */
  talking: boolean;
  /** Last pointer-independent event the 3D side may react to (chat opened etc.). */
  chatOpen: boolean;
};

export const guideState: GuideState = {
  owner: null,
  anchor: null,
  face: "idle",
  activeIndex: -1,
  hopRequest: 0,
  talking: false,
  chatOpen: false,
};

/** DOM helper: write an element's rect as the anchor. Call from a rAF or scroll handler. */
export function setGuideAnchor(el: Element | null, side: GuideAnchor["side"]) {
  if (!el) {
    guideState.anchor = null;
    return;
  }
  const r = el.getBoundingClientRect();
  guideState.anchor = { x: r.left, y: r.top, width: r.width, height: r.height, side };
}

export function requestHop() {
  guideState.hopRequest += 1;
}
