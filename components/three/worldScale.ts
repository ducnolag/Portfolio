/**
 * World ↔ viewport scale for the fixed camera.
 *
 * The camera never moves: scenes are glued to their DOM sections by translating
 * rigs with `-scrollY * worldPerPixel`. These helpers give the conversion for
 * the z = 0 plane (and any other z) so every WebGL piece uses the same numbers.
 */

export const CAMERA_Z = 10;
export const CAMERA_FOV = 35;

const HALF_FOV_TAN = Math.tan((CAMERA_FOV * Math.PI) / 360);

/** Visible world height at depth `z` (default: the z = 0 working plane). */
export function visibleHeightAtZ(z = 0): number {
  return 2 * HALF_FOV_TAN * (CAMERA_Z - z);
}

/** Visible world width at depth `z` for a viewport aspect ratio. */
export function visibleWidthAtZ(aspect: number, z = 0): number {
  return visibleHeightAtZ(z) * aspect;
}

/** World units per CSS pixel at depth `z`. */
export function worldPerPixel(viewportHeightPx: number, z = 0): number {
  return visibleHeightAtZ(z) / Math.max(1, viewportHeightPx);
}

/**
 * World position of a viewport point (CSS px from the top-left) on the
 * z = 0 plane. Useful to glue an object to a DOMRect each frame.
 */
export function viewportToWorld(
  xPx: number,
  yPx: number,
  widthPx: number,
  heightPx: number,
): { x: number; y: number } {
  const wpp = worldPerPixel(heightPx);
  return {
    x: (xPx - widthPx / 2) * wpp,
    y: (heightPx / 2 - yPx) * wpp,
  };
}

/**
 * Where a `position: sticky; top: 0` stage of viewport height sits inside its
 * section, given the section's DOMRect. Returns the stage's top in viewport px.
 */
export function stickyStageTop(sectionTop: number, sectionBottom: number, vh: number): number {
  return Math.min(Math.max(sectionTop, 0), sectionBottom - vh);
}
