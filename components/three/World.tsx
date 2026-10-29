"use client";

import dynamic from "next/dynamic";

/**
 * The one fixed WebGL world behind the page. SSR-safe wrapper: the Canvas
 * chunk loads on the client only, and a CSS field stands in until (and
 * beneath) it so the first paint already has the ink ground and the sun.
 */
const WorldCanvas = dynamic(() => import("./WorldCanvas").then((m) => m.WorldCanvas), {
  ssr: false,
});

export function WorldFallback() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 70% at 72% 92%, color-mix(in oklab, var(--neon) 22%, transparent) 0%, color-mix(in oklab, var(--magenta) 10%, transparent) 32%, transparent 62%)," +
          "radial-gradient(90% 60% at 10% 0%, color-mix(in oklab, var(--indigo-deep) 45%, transparent) 0%, transparent 60%)," +
          "var(--ink)",
      }}
    />
  );
}

export function World() {
  return (
    <div
      aria-hidden="true"
      data-world
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    >
      <WorldFallback />
      <WorldCanvas />
    </div>
  );
}
