/**
 * Shared, mutable snapshot of the build companion "Lag" (the TV-headed robot), written every
 * frame by `Companion` and readable by DOM components. Dependency-free.
 */
export type CompanionState = {
  /** Held-scene progress 0..1 (mirrors `heldProgress`). */
  progress: number;
  /** 0 = gliding in (idle), 1 = thinking, 2 = happy / leaving. */
  phase: 0 | 1 | 2;
  /** True while it is hopping or showing the happy face. */
  happy: boolean;
  /** True while the WebGL character is on screen. */
  active: boolean;
  /** Floor contact point in backdrop units (x / viewportHeight, y / viewportHeight), for the stage light. */
  spotX: number;
  spotY: number;
  /** Strength of the stage light under it (1 in the companion scene, dimmer while guiding). */
  spotGain: number;
  /** True while Lag has left the companion scene and follows the page as the guide. */
  guided: boolean;
};

export const companionState: CompanionState = {
  progress: 0,
  phase: 0,
  happy: false,
  active: false,
  spotX: 0.3,
  spotY: -0.3,
  spotGain: 0,
  guided: false,
};
