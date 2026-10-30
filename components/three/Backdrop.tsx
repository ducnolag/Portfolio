"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, type ShaderMaterial, Vector2 } from "three";
import { scrollState } from "@/lib/scroll";
import { companionState } from "./companionState";

/* ─────────────────────────────────────────────────────────────
   The one moving picture: a dark neon field that never stops drifting.
   Near-black ink, a violet/neon glow low behind the badge, magenta on the
   horizon, indigo shadow mass, an electric-blue spill upper-left, a faint
   polar grid fading out from the glow, film grain, vignette.
   One draw call, no textures.
   ───────────────────────────────────────────────────────────── */

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uAspect;
  uniform vec2 uPointer;
  uniform float uVelocity;
  uniform vec2 uSun;        // glow centre in aspect-corrected space
  uniform float uSunGain;   // glow strength
  uniform float uCool;      // shadow / cool spill strength
  uniform float uLift;      // overall brightness (chapter)
  uniform float uTint;      // 0 = neon glow, 1 = electric (cool) glow
  uniform vec2 uSpot;       // stage-light ellipse centre (companion chapter)
  uniform float uSpotGain;
  uniform vec3 uInk;
  uniform vec3 uGlow;       // neon
  uniform vec3 uViolet;
  uniform vec3 uMagenta;
  uniform vec3 uOrchid;
  uniform vec3 uElectric;
  uniform vec3 uIndigo;

  // ── simplex 2d (Ashima) ──
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // thin anti-aliased line where v crosses an integer
  float gridLine(float v, float px) {
    float f = abs(fract(v) - 0.5);
    return smoothstep(0.5 - px * 1.5, 0.5 - px * 0.5, f);
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float t = uTime;

    // pointer parallax: the whole field slides a little against the hand
    vec2 par = uPointer * vec2(0.035, 0.025);

    // slow domain warp; scroll velocity stirs it
    float stir = 1.0 + min(abs(uVelocity), 1.0) * 1.6;
    float n1 = snoise(p * 0.9 + vec2(t * 0.025, -t * 0.018) + par);
    float n2 = snoise(p * 1.9 - vec2(t * 0.012, t * 0.03) + n1 * 0.35);
    vec2 warp = vec2(n1, n2) * (0.10 * stir);

    // ── glow: neon core, violet halo, orchid rim ──
    vec2 sp = p + par * 1.8 - uSun + warp * 0.6;
    float d = length(sp * vec2(1.0, 1.25));
    float core = exp(-d * d * 10.0);
    float halo = exp(-d * 3.5);   // 25 % tighter than the first neon cut
    float rim = exp(-d * 1.5) * 0.5;

    // ── horizon: a magenta band across the lower third ──
    float horizonY = uSun.y + 0.1 + warp.y * 0.5;
    float band = exp(-abs(p.y - horizonY) * 5.0) * 0.06 * halo;

    // ── indigo shadow mass (broad, opposite the glow) + electric spill upper-left ──
    vec2 ip = p - vec2(-uSun.x * 0.5, 0.15) + warp * 0.8;
    float indigo = exp(-length(ip * vec2(0.55, 0.9)) * 0.95);
    vec2 ep = p - vec2(-uSun.x * 0.95, 0.55) + warp;
    float spill = exp(-length(ep * vec2(0.6, 1.0)) * 1.7);
    float under = exp(-length(p - vec2(uSun.x * 0.4, -0.8) + warp.yx) * 2.2) * 0.5;

    vec3 col = uInk;
    col = mix(col, uIndigo, indigo * (0.32 * uCool));
    col = mix(col, uElectric, spill * (0.1 * uCool));
    col = mix(col, uViolet, under * (0.05 * uCool));
    col += uMagenta * (halo * 0.06 + band) * uSunGain;
    col += uViolet * (halo * 0.09) * uSunGain;
    vec3 glowCol = mix(uGlow, uElectric, uTint);
    col += glowCol * (core * 0.62) * uSunGain;
    col += uOrchid * rim * 0.02 * uSunGain;

    // velocity flares the glow for a moment
    col += uGlow * core * min(abs(uVelocity), 1.0) * 0.25;

    // ── stage light: a soft pool under the companion ──
    vec2 sq = (p - uSpot) * vec2(0.9, 3.0);
    float spot = exp(-dot(sq, sq) * 3.0) * uSpotGain;
    col += (uElectric * 0.34 + uOrchid * 0.08) * spot;

    // ── faint polar grid, fading out from the glow centre ──
    vec2 gp = p + par * 1.2 - uSun;
    float gr = length(gp);
    float ga = atan(gp.y, gp.x) / 6.2831853 + 0.5;
    float pxR = fwidth(gr * 5.0);
    float pxA = fwidth(ga * 28.0);
    float rings = gridLine(gr * 5.0, max(pxR, 0.006));
    float spokes = gridLine(ga * 28.0, max(pxA, 0.006)) * smoothstep(0.08, 0.35, gr);
    float grid = max(rings, spokes) * exp(-gr * 1.5) * 0.06;
    col += uOrchid * grid * (0.6 + 0.4 * uSunGain);

    // dust: large slow mottling so the dark reads as air, not a flat fill
    float dust = snoise(p * 3.5 + vec2(t * 0.02, t * 0.015)) * 0.5 + 0.5;
    col += (uOrchid * 0.005) * dust * (0.3 + halo);

    col *= uLift;

    // vignette
    vec2 vq = vUv - 0.5;
    float vig = 1.0 - smoothstep(0.25, 0.95, dot(vq, vq) * 2.2);
    col *= mix(0.42, 1.0, vig);

    // film grain, animated
    float g = hash(gl_FragCoord.xy + fract(t * 61.0) * 100.0) - 0.5;
    col += g * 0.014;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
    #include <colorspace_fragment>
  }
`;

/* Chapter table: hero → companion → about/portrait → projects → contact.
   glowX, glowY (aspect units), glow gain, shadow gain, overall lift, cool tint. */
const CHAPTERS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [0.46, -0.4, 1.0, 1.0, 1.0, 0.0], // 0 hero: glow behind the badge, low right
  [0.0, -0.62, 0.42, 0.9, 0.85, 0.7], // 1 companion: dim, centre-low, electric; the stage light does the rest
  [0.0, -0.3, 0.55, 1.25, 0.9, 0.25], // 2 about / portrait: cooler, dimmer, particles read
  [-0.55, -0.45, 0.8, 1.0, 0.95, 0.0], // 3 projects: glow from the left
  [0.3, -0.7, 0.95, 0.7, 1.0, 0.0], // 4 contact: low glow again
];

/** One triangle covering the clip space; the vertex shader ignores the camera. */
const TRIANGLE = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Anchors = {
  about: Element | null;
  projects: Element | null;
  contact: Element | null;
  nextQuery: number;
};

/** Monotonic 0..4 chapter from scroll and the section rects (null-safe). */
function readChapter(a: Anchors, now: number): number {
  if (now > a.nextQuery && (!a.about || !a.projects || !a.contact)) {
    a.nextQuery = now + 500;
    a.about ??= document.getElementById("about");
    a.projects ??= document.getElementById("projects");
    a.contact ??= document.getElementById("contact");
  }
  const vh = window.innerHeight || 1;
  // hero → companion: the scene starts right after the first screen.
  let c = clamp01((scrollState.y - vh * 0.55) / (vh * 0.9));
  // each chapter starts when its section's top enters from the bottom edge
  const edge = (el: Element | null, base: number) => {
    if (!el || !el.isConnected) return;
    const top = el.getBoundingClientRect().top;
    if (top >= vh) return;
    c = Math.max(c, base + clamp01(1 - top / vh));
  };
  edge(a.about, 1);
  edge(a.projects, 2);
  edge(a.contact, 3);
  return Math.min(4, c);
}

function makeUniforms() {
  return {
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uPointer: { value: new Vector2() },
    uVelocity: { value: 0 },
    uSun: { value: new Vector2(CHAPTERS[0][0], CHAPTERS[0][1]) },
    uSunGain: { value: 1 },
    uCool: { value: 1 },
    uLift: { value: 1 },
    uTint: { value: 0 },
    uSpot: { value: new Vector2(0.3, -0.3) },
    uSpotGain: { value: 0 },
    uInk: { value: new Color("#07060d") },
    uGlow: { value: new Color("#a855f7") },
    uViolet: { value: new Color("#7c3aed") },
    uMagenta: { value: new Color("#e040fb") },
    uOrchid: { value: new Color("#c084fc") },
    uElectric: { value: new Color("#5b8cff") },
    uIndigo: { value: new Color("#241a4d") },
  };
}

type Smooth = { chapter: number; velocity: number; px: number; py: number; tx: number; ty: number; lastY: number };

export function Backdrop() {
  const materialRef = useRef<ShaderMaterial>(null);
  const anchors = useRef<Anchors>({ about: null, projects: null, contact: null, nextQuery: 0 });
  const smooth = useRef<Smooth>({ chapter: 0, velocity: 0, px: 0, py: 0, tx: 0, ty: 0, lastY: 0 });
  const uniforms = useMemo(() => makeUniforms(), []);

  useEffect(() => {
    const s = smooth.current;
    const onMove = (e: PointerEvent) => {
      s.tx = (e.clientX / window.innerWidth) * 2 - 1;
      s.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, dt) => {
    const mat = materialRef.current;
    if (!mat) return;
    const u = mat.uniforms;
    const s = smooth.current;
    const k = 1 - Math.exp(-dt * 3.2);
    const target = readChapter(anchors.current, state.clock.elapsedTime * 1000);
    s.chapter = lerp(s.chapter, target, k);
    // own per-frame speed: scrollState.velocity only updates on scroll events and would hold after a jump
    const dy = scrollState.y - s.lastY;
    s.lastY = scrollState.y;
    const perFrame = Math.min(60, Math.abs(dy) / Math.max(1, dt * 60));
    s.velocity = lerp(s.velocity, perFrame / 28, 1 - Math.exp(-dt * 6));
    s.px = lerp(s.px, s.tx, 1 - Math.exp(-dt * 4));
    s.py = lerp(s.py, s.ty, 1 - Math.exp(-dt * 4));

    const i = Math.min(3, Math.floor(s.chapter));
    const f = s.chapter - i;
    const a = CHAPTERS[i];
    const b = CHAPTERS[i + 1];
    (u.uSun.value as Vector2).set(lerp(a[0], b[0], f), lerp(a[1], b[1], f));
    u.uSunGain.value = lerp(a[2], b[2], f);
    u.uCool.value = lerp(a[3], b[3], f);
    u.uLift.value = lerp(a[4], b[4], f);
    u.uTint.value = lerp(a[5], b[5], f);
    // the stage light lives in chapter 1 only, under the companion's feet
    (u.uSpot.value as Vector2).set(companionState.spotX, companionState.spotY);
    u.uSpotGain.value = companionState.active ? companionState.spotGain : 0;

    u.uTime.value = state.clock.elapsedTime;
    u.uAspect.value = state.size.width / Math.max(1, state.size.height);
    (u.uPointer.value as Vector2).set(s.px, s.py);
    u.uVelocity.value = s.velocity;
  });

  return (
    <mesh name="backdrop" frustumCulled={false} renderOrder={-10}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[TRIANGLE, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
