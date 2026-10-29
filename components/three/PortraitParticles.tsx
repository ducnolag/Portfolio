"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  CustomBlending,
  type Group,
  OneFactor,
  OneMinusSrcAlphaFactor,
  type Points,
  type ShaderMaterial,
} from "three";
import { heldProgress } from "@/lib/scroll";
import { useDeviceTier, useReducedMotion } from "@/lib/hooks";
import { stickyStageTop, worldPerPixel } from "./worldScale";

/* ─────────────────────────────────────────────────────────────
   Scene 2: the sunset photograph as 40–60k particles.
   progress 0→0.33 scattered drift · 0.33→0.66 resolve · 0.66→1 tilt + blow away
   Driven by heldProgress('[data-scene="portrait"]'), glued to its sticky stage.
   ───────────────────────────────────────────────────────────── */

const IMAGE_SRC = "/images/duc-sunset.jpg";
const IMAGE_ASPECT = 761 / 960;
const SECTION_SELECTOR = '[data-scene="portrait"]';

const vertex = /* glsl */ `
  attribute vec3 aTarget;
  attribute vec3 aScatter;
  attribute vec3 aColor;
  attribute float aSeed;

  uniform float uProgress;
  uniform float uTime;
  uniform float uPointSize;
  uniform float uTilt;
  uniform float uHalfHeight;
  uniform vec3 uNeon;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vSoft;

  float easeOutCubic(float t) { return 1.0 - pow(1.0 - t, 3.0); }
  float easeInQuad(float t) { return t * t; }

  mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c); }
  mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c); }

  void main() {
    float p = uProgress;
    float t = uTime;

    // ── A: scattered cloud, breathing ──
    vec3 drift = vec3(
      sin(t * 0.55 + aSeed * 31.7) + sin(t * 0.21 + aSeed * 9.1),
      cos(t * 0.47 + aSeed * 17.3) + sin(t * 0.33 + aSeed * 4.7),
      sin(t * 0.61 + aSeed * 7.9)
    ) * 0.09 * uHalfHeight;
    vec3 scattered = aScatter + drift;

    // ── B: resolve, staggered per point; slight arc on the way in ──
    float stagger = aSeed * 0.14;
    float r = clamp((p - 0.30 - stagger) / (0.34 - 0.14), 0.0, 1.0);
    float re = easeOutCubic(r);
    vec3 arc = vec3(0.0, sin(re * 3.14159) * 0.18 * uHalfHeight * (aSeed - 0.5), 0.0);
    vec3 pos = mix(scattered, aTarget, re) + arc * (1.0 - re);

    // ── C: tilt the plane, then the wind takes the grains ──
    float s = clamp((p - 0.66) / 0.34, 0.0, 1.0);
    float tilt = uTilt * easeOutCubic(min(1.0, s * 1.6));
    pos = rotX(tilt * 0.55) * rotY(-tilt) * pos;

    // the wind starts from the lit side (right) and takes the top first
    float order = 0.5 + 0.5 * (-aTarget.x / uHalfHeight) * 0.35 - (aTarget.y / uHalfHeight) * 0.25;
    float w = clamp((s - 0.12 - order * 0.30 - aSeed * 0.18) / 0.45, 0.0, 1.0);
    float we = easeInQuad(w);
    vec3 gust = vec3(
      1.8 + aSeed * 2.6,
      0.4 + sin(aSeed * 40.0 + t * 1.3) * 0.5 + aSeed * 0.6,
      0.6 + aSeed * 1.2
    ) * uHalfHeight;
    vec3 swirl = vec3(
      sin(t * 2.1 + aSeed * 50.0),
      cos(t * 1.7 + aSeed * 30.0),
      sin(t * 1.3 + aSeed * 20.0)
    ) * 0.12 * uHalfHeight * we;
    pos += gust * we + swirl;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float resolved = re * (1.0 - we);
    float size = uPointSize * mix(1.35 + aSeed * 0.8, 1.0 + aSeed * 0.25, re) * (1.0 - we * 0.5);
    gl_PointSize = size * (10.0 / -mv.z);

    // scattered grains are neon; the photograph's colour arrives with the resolve
    vColor = mix(uNeon * (0.7 + aSeed * 0.6), aColor, re);
    vSoft = 1.0 - re * 0.7 + we * 0.6;
    vAlpha = mix(0.55, 0.98, re) * (1.0 - easeInQuad(we));
    // scattered state: only the lit grains glow, the dark ones vanish into the ink
    float lum = dot(aColor, vec3(0.299, 0.587, 0.114));
    vAlpha *= mix(0.25 + lum * 1.4, 1.0, resolved);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSoft;
  uniform float uGain;

  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float d = length(q) * 2.0;
    float a = 1.0 - smoothstep(0.55 - vSoft * 0.35, 1.0, d);
    a *= vAlpha;
    if (a < 0.004) discard;
    vec3 col = vColor * uGain;
    gl_FragColor = vec4(col * a, a);   // premultiplied
    #include <colorspace_fragment>
  }
`;

type Cloud = {
  count: number;
  target: Float32Array;
  scatter: Float32Array;
  color: Float32Array;
  seed: Float32Array;
};

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/* Duotone ramp keyed on luminance: indigo-deep -> violet -> magenta -> orchid -> fg.
   Each sampled colour is mixed 45 % toward it so the sunset reads as a
   neon-lit night picture instead of an orange hole in a violet page. */
const RAMP: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.0, 0x24 / 255, 0x1a / 255, 0x4d / 255],
  [0.35, 0x7c / 255, 0x3a / 255, 0xed / 255],
  [0.6, 0xe0 / 255, 0x40 / 255, 0xfb / 255],
  [0.85, 0xc0 / 255, 0x84 / 255, 0xfc / 255],
  [1.0, 0xef / 255, 0xea / 255, 0xfc / 255],
];
const GRADE = 0.45;

function rampAt(l: number): [number, number, number] {
  for (let i = 1; i < RAMP.length; i++) {
    if (l <= RAMP[i][0]) {
      const a = RAMP[i - 1], b = RAMP[i];
      const t = (l - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
    }
  }
  const e = RAMP[RAMP.length - 1];
  return [e[1], e[2], e[3]];
}

/** Sample the photograph into point attributes (world units, image height = 2 * halfHeight). */
function sampleImage(img: HTMLImageElement, cols: number, rows: number, halfHeight: number): Cloud | null {
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, cols, rows);
  const data = ctx.getImageData(0, 0, cols, rows).data;

  const halfWidth = halfHeight * IMAGE_ASPECT;
  const target: number[] = [];
  const scatter: number[] = [];
  const color: number[] = [];
  const seed: number[] = [];
  // deterministic jitter so the grid reads as grain, not as a raster
  let rnd = 1234567;
  const rand = () => {
    rnd = (rnd * 1664525 + 1013904223) >>> 0;
    return rnd / 4294967296;
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // the darkest grains are invisible on ink: skip most of them, keep a few for body
      if (lum < 0.05 && rand() > 0.3) continue;

      const u = (x + 0.5) / cols - 0.5 + ((rand() - 0.5) * 0.6) / cols;
      const v = 0.5 - (y + 0.5) / rows + ((rand() - 0.5) * 0.6) / rows;
      target.push(u * 2 * halfWidth, v * 2 * halfHeight, (lum - 0.45) * halfHeight * 0.35);

      // scatter: a loose shell around the frame, biased to the sky side
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      const rad = halfHeight * (1.05 + rand() * 0.9);
      scatter.push(
        Math.sin(ph) * Math.cos(th) * rad * 1.4,
        Math.cos(ph) * rad * 0.8 + halfHeight * 0.1,
        Math.sin(ph) * Math.sin(th) * rad * 0.7 - halfHeight * 0.3,
      );

      // a touch more saturation, then graded toward the neon duotone
      const sat = 1.12;
      const [dr, dg, db] = rampAt(lum);
      const rr = Math.min(1, lum + (r - lum) * sat) * (1 - GRADE) + dr * GRADE;
      const gg = Math.min(1, lum + (g - lum) * sat) * (1 - GRADE) + dg * GRADE;
      const bb = Math.min(1, lum + (b - lum) * sat) * (1 - GRADE) + db * GRADE;
      color.push(srgbToLinear(rr), srgbToLinear(gg), srgbToLinear(bb));
      seed.push(rand());
    }
  }
  return {
    count: seed.length,
    target: new Float32Array(target),
    scatter: new Float32Array(scatter),
    color: new Float32Array(color),
    seed: new Float32Array(seed),
  };
}

const GRID: Record<0 | 1 | 2, [number, number]> = {
  0: [120, 152],
  1: [180, 227],
  2: [220, 278],
};

/** World-space half height of the image plane; the group scales it to the viewport. */
const BASE_HALF_HEIGHT = 1;

function makeUniforms() {
  return {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uPointSize: { value: 2 },
    uTilt: { value: 0 },
    uHalfHeight: { value: BASE_HALF_HEIGHT },
    uGain: { value: 1.05 },
    uNeon: { value: new Color("#a855f7") },
  };
}

export function PortraitParticles() {
  const tier = useDeviceTier();
  const reduced = useReducedMotion();
  const groupRef = useRef<Group>(null);
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const sectionRef = useRef<Element | null>(null);
  const [cloud, setCloud] = useState<Cloud | null>(null);
  const uniforms = useMemo(() => makeUniforms(), []);

  // Build the cloud once per tier (async: decode, then sample).
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = IMAGE_SRC;
    img
      .decode()
      .then(() => {
        if (cancelled) return;
        const [cols, rows] = GRID[tier];
        setCloud(sampleImage(img, cols, rows, BASE_HALF_HEIGHT));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tier]);

  // Find the section lazily; the DOM may land after us.
  useEffect(() => {
    const look = () => {
      const el = document.querySelector(SECTION_SELECTOR);
      if (el) sectionRef.current = el;
      return !!el;
    };
    if (look()) return;
    const id = window.setInterval(() => {
      if (look()) window.clearInterval(id);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  useFrame((state) => {
    const group = groupRef.current;
    const points = pointsRef.current;
    const mat = materialRef.current;
    if (!group || !points || !mat) return;
    const section = sectionRef.current;
    if (!section || !section.isConnected) {
      if (section && !section.isConnected) sectionRef.current = null;
      points.visible = false;
      return;
    }
    const vh = window.innerHeight || 1;
    const vw = window.innerWidth || 1;
    const rect = section.getBoundingClientRect();
    // Render only while the section is within one viewport of the screen.
    const near = rect.bottom > -vh && rect.top < vh * 2;
    points.visible = near;
    if (!near) return;

    const wpp = worldPerPixel(vh);
    const stageTop = stickyStageTop(rect.top, rect.bottom, vh);
    const stageCenterPx = stageTop + vh / 2;
    group.position.set(0, (vh / 2 - stageCenterPx) * wpp, 0);

    // Image fills ~70% of the viewport height (and never more than 80% of width).
    const imgHeightPx = Math.min(vh * 0.7, (vw * 0.8) / IMAGE_ASPECT);
    const halfHeight = (imgHeightPx * wpp) / 2;
    group.scale.setScalar(halfHeight / BASE_HALF_HEIGHT);

    const u = mat.uniforms;
    u.uProgress.value = reduced ? 0.6 : heldProgress(section);
    u.uTime.value = state.clock.elapsedTime;
    u.uTilt.value = reduced ? 0 : 0.55;
    const [, rows] = GRID[tier];
    const dpr = state.gl.getPixelRatio();
    // point ≈ 1.55 × grid pitch so the resolved image is continuous; gl_PointSize scales by 10/-z
    const pitchPx = imgHeightPx / rows;
    u.uPointSize.value = Math.max(1.6, pitchPx * 1.55) * dpr;
  });

  if (!cloud || cloud.count === 0) return null;

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry key={cloud.count}>
          <bufferAttribute attach="attributes-position" args={[cloud.target, 3]} />
          <bufferAttribute attach="attributes-aTarget" args={[cloud.target, 3]} />
          <bufferAttribute attach="attributes-aScatter" args={[cloud.scatter, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[cloud.color, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[cloud.seed, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
          blending={CustomBlending}
          blendSrc={OneFactor}
          blendDst={OneMinusSrcAlphaFactor}
        />
      </points>
    </group>
  );
}
