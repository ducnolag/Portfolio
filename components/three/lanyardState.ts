/**
 * Tiny shared, mutable snapshot of the lanyard rig, written once per frame by
 * `Lanyard` and read by the pieces that orbit it (`NeonRing`, `TechGlyphs`).
 * Plain object on purpose: no React state, no subscriptions, read inside useFrame.
 */
export type LanyardState = {
  /** True once the rig has laid itself out for the current viewport. */
  ready: boolean;
  /** Card scale factor (1 = 1.6 × 2.25 world units). */
  scale: number;
  /** Card height in world units at the current scale. */
  cardHeight: number;
  /** Rest position of the card centre (rig space, z = 0 plane). */
  restX: number;
  restY: number;
  /** Live card centre (rig space). */
  x: number;
  y: number;
  z: number;
  /** Card speed in world units per second. */
  speed: number;
  /** Card roll (rotation about z) in radians. */
  roll: number;
  /** True while the hero rig is simulating (not scrolled away). */
  awake: boolean;
  /** Visible world width/height at z = 0 for the current viewport. */
  viewW: number;
  viewH: number;
};

export const lanyardState: LanyardState = {
  ready: false,
  scale: 1,
  cardHeight: 2.25,
  restX: 0,
  restY: 0,
  x: 0,
  y: 0,
  z: 0,
  speed: 0,
  roll: 0,
  awake: true,
  viewW: 10,
  viewH: 6.3,
};
