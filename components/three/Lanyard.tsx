"use client";

import { extend, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  DoubleSide,
  type Group,
  type MeshBasicMaterial,
  type MeshPhysicalMaterial,
  type PointLight,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";
import { profile, ui } from "@/lib/content";
import { useReducedMotion } from "@/lib/hooks";
import { useLang } from "@/lib/i18n";
import { scrollState } from "@/lib/scroll";
import { lanyardState } from "./lanyardState";
import { CAMERA_Z, visibleHeightAtZ, worldPerPixel } from "./worldScale";

/* ─────────────────────────────────────────────────────────────
   The badge on a lanyard. Custom Verlet rope (24 segments) with a
   heavier card point at the end; meshline strap; metal clip; a
   MeshPhysicalMaterial card whose faces are CanvasTextures drawn at
   runtime from Đức's mirror photo and the bilingual copy.
   ───────────────────────────────────────────────────────────── */

const MeshLineGeometryEl = extend(MeshLineGeometry);
const MeshLineMaterialEl = extend(MeshLineMaterial);
/** Strap width: 0.08 world units at the z = 0 plane. MeshLine's attenuated
    width is in clip units, so scale by 2 · cameraZ / visibleHeight. */
const STRAP_WORLD_WIDTH = 0.08;
const STRAP_LINE_WIDTH = (STRAP_WORLD_WIDTH * 2 * CAMERA_Z) / visibleHeightAtZ(0);
/** Stable constructor args so R3F never rebuilds the material. */
const STRAP_ARGS: [ConstructorParameters<typeof MeshLineMaterial>[0]] = [
  { resolution: new Vector2(1, 1), lineWidth: STRAP_LINE_WIDTH, sizeAttenuation: 1 },
];

const INK = "#07060d";
const INK_3 = "#151127";
const CREAM = "#efeafc"; // fg
const MUTED = "#aaa3cc"; // fg-muted
const AMBER = "#7c3aed"; // violet: the accent role
const SAND = "#c084fc"; // orchid: secondary text
const MAGENTA = "#e040fb";
const NEON = "#a855f7";
const CHROME = "#c9d4ff"; // electric-tinted metal

const CARD_W = 1.6;
const CARD_H = 2.25;
const CARD_R = 0.12;
const CARD_D = 0.03;
/** Landscape cap so very tall viewports never get a poster-sized badge. */
const CARD_MAX_PX = 520;
const TEX_W = 1024;
const TEX_H = 1440;

const ROPE_SEGMENTS = 24;
const ROPE_POINTS = ROPE_SEGMENTS + 1; // 0 = anchor … 24 = strap end (ring top)
const CARD_INDEX = ROPE_POINTS; // the card's centre of mass
const POINT_COUNT = ROPE_POINTS + 1;
const RING_R = 0.1;
const SUBSTEP = 1 / 120;
/** Catch-up budget per frame: real-time down to 10 fps, slow-motion below. */
const MAX_SUBSTEPS = 12;
const ITERATIONS = 7;
const GRAVITY = 15;
const ROPE_DAMP = 0.99;
const CARD_DAMP = 0.984;
const MAX_STEP_SPEED = 0.14; // world units per substep
const WALL_RESTITUTION = 0.42;
const TAP_PX = 6;
const TAP_MS = 260;
/** Shared hero tempo: badge sway period 6 s (ring 40 s, glyph orbit 48 s). */
const SWAY_OMEGA = (Math.PI * 2) / 6;

/** Rounded-rectangle outline of the card (module constant, built once). */
const CARD_SHAPE = (() => {
  const s = new Shape();
  const w = CARD_W / 2, h = CARD_H / 2, r = CARD_R;
  s.moveTo(-w + r, -h);
  s.lineTo(w - r, -h);
  s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r);
  s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h);
  s.quadraticCurveTo(-w, h, -w, h - r);
  s.lineTo(-w, -h + r);
  s.quadraticCurveTo(-w, -h, -w + r, -h);
  return s;
})();
const EXTRUDE = {
  depth: CARD_D,
  bevelEnabled: true,
  bevelThickness: 0.006,
  bevelSize: 0.006,
  bevelSegments: 2,
  curveSegments: 10,
};

type Layout = {
  width: number;
  height: number;
  viewW: number;
  viewH: number;
  portrait: boolean;
  scale: number;
  anchorX: number;
  anchorY: number;
  segLen: number;
  hangLen: number;
  cardHalf: number;
  /** How far above its rest the whole rig starts for the entrance. */
  drop: number;
};

type Sim = {
  pos: Float32Array;
  prev: Float32Array;
  strap: Float32Array;
  layout: Layout;
  initialised: boolean;
  /** 0..1 entrance progress: the anchor is lowered from above the viewport. */
  entrance: number;
  /** The entrance waits for a couple of smooth frames (shader compiles happen first). */
  started: boolean;
  smoothFrames: number;
  waited: number;
  accumulator: number;
  time: number;
  dragging: boolean;
  hovered: boolean;
  pointerId: number;
  /** drag target (rig space) and its smoothed follower */
  target: Vector3;
  follow: Vector3;
  grabOffset: Vector3;
  up: Vector3;
  downX: number;
  downY: number;
  downT: number;
  yaw: number;
  pitch: number;
  awake: boolean;
};

type Textures = { front: CanvasTexture; back: CanvasTexture; strap: CanvasTexture };

function computeLayout(width: number, height: number): Layout {
  const aspect = width / Math.max(1, height);
  const viewH = visibleHeightAtZ(0);
  const viewW = viewH * aspect;
  const portrait = aspect < 0.9;
  // Landscape: the card is ~44% of the viewport height, never taller than
  // 520 px, never wider than the room right of the anchor. Portrait: by width.
  const scaleByHeight = (0.44 * viewH) / CARD_H;
  const scaleByPxCap = ((CARD_MAX_PX / Math.max(1, height)) * viewH) / CARD_H;
  const scaleByRoom = (0.3 * viewW * 0.8) / (CARD_W / 2);
  const scale = portrait
    ? Math.min(1, Math.max(0.74, viewW / 4.4))
    : Math.max(0.74, Math.min(scaleByHeight, scaleByPxCap, scaleByRoom));
  const cardHalf = (CARD_H / 2) * scale;
  const anchorX = portrait ? 0 : (0.7 - 0.5) * viewW;
  const anchorY = viewH / 2 + 0.3;
  // card centre at ~50% of the viewport on landscape, ~35% on portrait (text sits below)
  const centreY = portrait ? viewH * 0.15 : 0;
  const hangLen = cardHalf + RING_R * 1.2;
  const ropeLen = Math.max(0.8, anchorY - (centreY + hangLen));
  const drop = viewH / 2 + cardHalf - centreY + 0.3;
  return {
    width,
    height,
    viewW,
    viewH,
    portrait,
    scale,
    anchorX,
    anchorY,
    segLen: ropeLen / ROPE_SEGMENTS,
    hangLen,
    cardHalf,
    drop,
  };
}

function createSim(): Sim {
  return {
    pos: new Float32Array(POINT_COUNT * 3),
    prev: new Float32Array(POINT_COUNT * 3),
    strap: new Float32Array((ROPE_POINTS + 1) * 3),
    layout: computeLayout(16, 9),
    initialised: false,
    entrance: 1,
    started: true,
    smoothFrames: 0,
    waited: 0,
    accumulator: 0,
    time: 0,
    dragging: false,
    hovered: false,
    pointerId: -1,
    target: new Vector3(),
    follow: new Vector3(),
    grabOffset: new Vector3(),
    up: new Vector3(),
    downX: 0,
    downY: 0,
    downT: 0,
    yaw: 0,
    pitch: 0,
    awake: true,
  };
}

const ENTRANCE_SECONDS = 1.5;
const ENTRANCE_SIDE = 0.7;

/** Where the pinned anchor is right now: at rest, or on its way down during the entrance. */
function anchorAt(sim: Sim, out: { x: number; y: number }) {
  const { anchorX, anchorY, drop } = sim.layout;
  const e = 0.5 - 0.5 * Math.cos(Math.PI * sim.entrance); // sine in-out: never out-accelerates gravity
  out.x = anchorX + ENTRANCE_SIDE * (1 - e);
  out.y = anchorY + drop * (1 - e);
  return out;
}

/**
 * Lay the rope out straight below the anchor. For the entrance the whole rig
 * starts above the viewport and the anchor is lowered in over ~1.5 s; the
 * Verlet rope carries the card down, stops it, and lets it swing out.
 */
function placeRope(sim: Sim, rest: boolean) {
  const { pos, prev, layout } = sim;
  const { segLen, hangLen } = layout;
  sim.entrance = rest ? 1 : 0;
  sim.started = rest;
  sim.smoothFrames = 0;
  sim.waited = 0;
  const a = anchorAt(sim, { x: 0, y: 0 });
  for (let i = 0; i < ROPE_POINTS; i++) {
    pos[i * 3] = a.x;
    pos[i * 3 + 1] = a.y - i * segLen;
    pos[i * 3 + 2] = 0;
  }
  const endY = pos[(ROPE_POINTS - 1) * 3 + 1];
  pos[CARD_INDEX * 3] = a.x;
  pos[CARD_INDEX * 3 + 1] = endY - hangLen;
  pos[CARD_INDEX * 3 + 2] = 0;
  prev.set(pos);
  sim.yaw = rest ? 0 : -0.35;
  sim.pitch = 0;
}

function satisfy(pos: Float32Array, a: number, b: number, rest: number, wa: number, wb: number, stiffness: number) {
  const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
  const bx = pos[b * 3], by = pos[b * 3 + 1], bz = pos[b * 3 + 2];
  let dx = bx - ax, dy = by - ay, dz = bz - az;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
  const diff = ((dist - rest) / dist) * stiffness;
  const wsum = wa + wb || 1;
  dx *= diff; dy *= diff; dz *= diff;
  const ka = wa / wsum, kb = wb / wsum;
  pos[a * 3] += dx * ka; pos[a * 3 + 1] += dy * ka; pos[a * 3 + 2] += dz * ka;
  pos[b * 3] -= dx * kb; pos[b * 3 + 1] -= dy * kb; pos[b * 3 + 2] -= dz * kb;
}

const anchorTmp = { x: 0, y: 0 };

function step(sim: Sim, wind: boolean) {
  const { pos, prev, layout } = sim;
  const { segLen, hangLen, viewW, viewH, cardHalf } = layout;
  const g = GRAVITY * SUBSTEP * SUBSTEP;
  const t = sim.time;
  if (sim.started && sim.entrance < 1) sim.entrance = Math.min(1, sim.entrance + SUBSTEP / ENTRANCE_SECONDS);
  const { x: anchorX, y: anchorY } = anchorAt(sim, anchorTmp);

  // integrate
  for (let i = 1; i < POINT_COUNT; i++) {
    const isCard = i === CARD_INDEX;
    if (isCard && sim.dragging) continue;
    const damp = isCard ? CARD_DAMP : ROPE_DAMP;
    const o = i * 3;
    let vx = (pos[o] - prev[o]) * damp;
    let vy = (pos[o + 1] - prev[o + 1]) * damp;
    let vz = (pos[o + 2] - prev[o + 2]) * damp;
    if (isCard) {
      const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (sp > MAX_STEP_SPEED) {
        const k = MAX_STEP_SPEED / sp;
        vx *= k; vy *= k; vz *= k;
      }
    }
    prev[o] = pos[o]; prev[o + 1] = pos[o + 1]; prev[o + 2] = pos[o + 2];
    let ax = 0;
    if (wind && !isCard) {
      // a breath of air along the strap so it never freezes solid
      ax = Math.sin(t * 0.7 + i * 0.35) * 0.9 + Math.sin(t * 1.9 + i * 0.1) * 0.25;
    }
    const az = -pos[o + 2] * 18; // keep the rig close to the z = 0 plane
    pos[o] += vx + ax * SUBSTEP * SUBSTEP;
    pos[o + 1] += vy - g;
    pos[o + 2] += vz + az * SUBSTEP * SUBSTEP;
  }

  if (sim.dragging) {
    const o = CARD_INDEX * 3;
    sim.follow.lerp(sim.target, 0.45);
    prev[o] = pos[o]; prev[o + 1] = pos[o + 1]; prev[o + 2] = pos[o + 2];
    pos[o] = sim.follow.x; pos[o + 1] = sim.follow.y; pos[o + 2] = sim.follow.z;
  }

  // constraints
  for (let k = 0; k < ITERATIONS; k++) {
    pos[0] = anchorX; pos[1] = anchorY; pos[2] = 0;
    for (let i = 0; i < ROPE_SEGMENTS; i++) {
      satisfy(pos, i, i + 1, segLen, i === 0 ? 0 : 1, 1, 0.9);
    }
    // the card is heavy: the strap end comes to it, not the other way round
    satisfy(pos, ROPE_POINTS - 1, CARD_INDEX, hangLen, 1, sim.dragging ? 0 : 0.12, 1);
    pos[0] = anchorX; pos[1] = anchorY; pos[2] = 0;
  }

  // walls for the card: it can be thrown, not lost
  if (!sim.dragging) {
    const o = CARD_INDEX * 3;
    const minX = -viewW / 2 + cardHalf * 0.5;
    const maxX = viewW / 2 - cardHalf * 0.5;
    const minY = -viewH / 2 + cardHalf * 0.6;
    const maxY = anchorY + 0.5 + layout.drop;
    const minZ = -0.9, maxZ = 1.4;
    const bounce = (idx: number, lo: number, hi: number) => {
      const p = pos[o + idx];
      if (p < lo || p > hi) {
        const v = p - prev[o + idx];
        const c = p < lo ? lo : hi;
        pos[o + idx] = c;
        prev[o + idx] = c + v * WALL_RESTITUTION;
      }
    };
    bounce(0, minX, maxX);
    bounce(1, minY, maxY);
    bounce(2, minZ, maxZ);
  }
}

/* ── canvas textures ─────────────────────────────────────────── */

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBarcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, key: string, color: string) {
  let seed = 7;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.fillStyle = color;
  let cx = x;
  while (cx < x + w) {
    const bw = 3 + Math.floor(rand() * 4) * 3;
    const gap = 3 + Math.floor(rand() * 3) * 3;
    if (cx + bw > x + w) break;
    ctx.fillRect(cx, y, bw, h);
    cx += bw + gap;
  }
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, px: number, family: string, spacing = "0px", stretch: CanvasFontStretch = "normal") {
  ctx.font = `${weight} ${px}px ${family}`;
  try {
    ctx.letterSpacing = spacing;
    ctx.fontStretch = stretch;
  } catch {
    /* older canvas implementations */
  }
}

type BadgeCopy = { title: string; role: string; since: string };

function drawFront(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, family: string, copy: BadgeCopy) {
  const W = TEX_W, H = TEX_H;
  const R = (CARD_R / CARD_W) * W;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, R);
  ctx.clip();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  // photo: upper 62 %, cover crop, full saturation (+2 % contrast), no tint;
  // only a short dark gradient at its bottom edge for the name to sit on
  const photoH = Math.round(H * 0.62);
  if (img) {
    const s = Math.max(W / img.naturalWidth, photoH / img.naturalHeight) * 1.04;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    try {
      ctx.filter = "contrast(1.02)";
    } catch {
      /* no canvas filters */
    }
    ctx.drawImage(img, (W - dw) / 2, -dh * 0.06, dw, dh);
    try {
      ctx.filter = "none";
    } catch {
      /* no canvas filters */
    }
    const fade = ctx.createLinearGradient(0, photoH - 170, 0, photoH);
    fade.addColorStop(0, "rgba(7,6,13,0)");
    fade.addColorStop(1, "rgba(7,6,13,1)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, photoH - 170, W, 170);
  } else {
    const ph = ctx.createLinearGradient(0, 0, 0, photoH);
    ph.addColorStop(0, "#241a4d");
    ph.addColorStop(1, INK);
    ctx.fillStyle = ph;
    ctx.fillRect(0, 0, W, photoH);
  }

  // violet stripe down the left edge: the access level
  ctx.fillStyle = AMBER;
  ctx.fillRect(0, 0, 16, H);

  // slot for the clip
  roundedRectPath(ctx, W / 2 - 78, 34, 156, 30, 15);
  ctx.fillStyle = "#030208";
  ctx.fill();
  ctx.strokeStyle = "rgba(239,234,252,0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // name
  ctx.fillStyle = CREAM;
  ctx.textBaseline = "alphabetic";
  let px = 100;
  setFont(ctx, 700, px, family, "-2px");
  while (ctx.measureText(profile.name).width > W - 72 - 90 && px > 56) {
    px -= 4;
    setFont(ctx, 700, px, family, "-2px");
  }
  ctx.fillText(profile.name, 72, 1000);

  // role · since
  ctx.fillStyle = SAND;
  setFont(ctx, 500, 34, family, "0px");
  ctx.fillText(copy.role, 72, 1058);
  ctx.fillStyle = MUTED;
  setFont(ctx, 400, 27, family, "0.5px");
  ctx.fillText(copy.since, 72, 1104);

  // hairline
  ctx.fillStyle = "rgba(239,234,252,0.14)";
  ctx.fillRect(72, 1150, W - 144, 2);

  // barcode + id line (fg bars with a magenta highlight run)
  drawBarcode(ctx, 72, 1196, 470, 96, profile.handle + copy.title, CREAM);
  ctx.save();
  ctx.beginPath();
  ctx.rect(300, 1196, 110, 96);
  ctx.clip();
  drawBarcode(ctx, 72, 1196, 470, 96, profile.handle + copy.title, MAGENTA);
  ctx.restore();
  ctx.fillStyle = MUTED;
  setFont(ctx, 500, 22, family, "4px");
  ctx.fillText("ID 2024 · VN · " + profile.handle.toUpperCase(), 72, 1336);

  // handle, right-aligned
  ctx.textAlign = "right";
  ctx.fillStyle = SAND;
  setFont(ctx, 700, 40, family, "-0.5px");
  ctx.fillText("@" + profile.handle, W - 72, 1292);
  ctx.textAlign = "left";

  // title along the right edge, reading upward
  ctx.save();
  ctx.translate(W - 46, 1150);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = CREAM;
  setFont(ctx, 700, 26, family, "7px");
  ctx.fillText(copy.title, -2, 0);
  ctx.restore();

  // 1 px inner hairline, then a crisp 2 px orchid outer edge on the clip boundary
  roundedRectPath(ctx, 12, 12, W - 24, H - 24, R - 10);
  ctx.strokeStyle = "rgba(239,234,252,0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  roundedRectPath(ctx, 0, 0, W, H, R);
  ctx.strokeStyle = "rgba(192,132,252,0.7)";
  ctx.lineWidth = 5; // half is clipped away: ~2 px visible at texture scale
  ctx.stroke();
  ctx.restore();
}

function drawBack(ctx: CanvasRenderingContext2D, family: string, copy: BadgeCopy) {
  const W = TEX_W, H = TEX_H;
  const R = (CARD_R / CARD_W) * W;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  roundedRectPath(ctx, 0, 0, W, H, R);
  ctx.clip();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  // magnetic band
  ctx.fillStyle = INK_3;
  ctx.fillRect(0, 150, W, 120);

  // violet stripe mirrors to the other edge on the back
  ctx.fillStyle = AMBER;
  ctx.fillRect(W - 16, 0, 16, H);

  // slot
  roundedRectPath(ctx, W / 2 - 78, 34, 156, 30, 15);
  ctx.fillStyle = "#030208";
  ctx.fill();

  // big handle, vertical
  ctx.save();
  ctx.translate(230, H - 120);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = CREAM;
  setFont(ctx, 800, 190, family, "-6px", "semi-condensed");
  ctx.fillText(profile.handle, 0, 0);
  ctx.restore();

  // title + role, small
  ctx.fillStyle = SAND;
  setFont(ctx, 700, 26, family, "7px");
  ctx.fillText(copy.title, 300, 360);
  ctx.fillStyle = MUTED;
  setFont(ctx, 400, 28, family, "0px");
  ctx.fillText(copy.role, 300, 410);
  ctx.fillText(copy.since, 300, 450);

  // barcode bottom-right
  drawBarcode(ctx, 300, H - 260, 560, 110, profile.name, CREAM);
  ctx.save();
  ctx.beginPath();
  ctx.rect(560, H - 260, 120, 110);
  ctx.clip();
  drawBarcode(ctx, 300, H - 260, 560, 110, profile.name, MAGENTA);
  ctx.restore();
  ctx.fillStyle = MUTED;
  setFont(ctx, 500, 22, family, "4px");
  ctx.fillText(profile.email.toUpperCase(), 300, H - 110);

  roundedRectPath(ctx, 12, 12, W - 24, H - 24, R - 10);
  ctx.strokeStyle = "rgba(239,234,252,0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  roundedRectPath(ctx, 0, 0, W, H, R);
  ctx.strokeStyle = "rgba(192,132,252,0.7)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

function makeStrapTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#e4dcff"; // lavender webbing
    ctx.fillRect(0, 0, 128, 64);
    // woven shading across the strap
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, "rgba(36,26,77,0.45)");
    g.addColorStop(0.18, "rgba(36,26,77,0)");
    g.addColorStop(0.82, "rgba(36,26,77,0)");
    g.addColorStop(1, "rgba(36,26,77,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 64);
    // violet centre seam
    ctx.fillStyle = "rgba(124,58,237,0.85)";
    ctx.fillRect(0, 30, 128, 3);
    // stitching
    ctx.fillStyle = "rgba(124,58,237,0.55)";
    for (let x = 4; x < 128; x += 16) {
      ctx.fillRect(x, 6, 8, 2);
      ctx.fillRect(x, 56, 8, 2);
    }
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}

function makeCardTexture(anisotropy: number): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function readDisplayFamily(): string {
  const fam = getComputedStyle(document.body).fontFamily;
  return fam && fam.length > 0 ? fam : "system-ui, sans-serif";
}

function setCursor(state: "grab" | "grabbing" | "") {
  document.body.style.cursor = state;
  if (state) document.body.dataset.grab = "1";
  else delete document.body.dataset.grab;
}

/* ── component ───────────────────────────────────────────────── */

export function Lanyard() {
  const { lang, t } = useLang();
  const reduced = useReducedMotion();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const sim = useRef<Sim>(createSim());
  const textures = useRef<Textures | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rigRef = useRef<Group>(null);
  const cardRef = useRef<Group>(null);
  const clipRef = useRef<Group>(null);
  const lightRef = useRef<PointLight>(null);
  const faceMatRef = useRef<MeshBasicMaterial>(null);
  const backMatRef = useRef<MeshPhysicalMaterial>(null);
  const strapGeoRef = useRef<MeshLineGeometry>(null);
  const strapMatRef = useRef<MeshLineMaterial>(null);

  const copy = useMemo<BadgeCopy>(
    () => ({
      title: t(ui.hero.badge.title),
      role: t(ui.hero.badge.role),
      since: t(ui.hero.badge.since),
    }),
    [t],
  );

  /* textures live for the component's life and are attached to the materials by ref */
  useEffect(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const tex: Textures = {
      front: makeCardTexture(aniso),
      back: makeCardTexture(aniso),
      strap: makeStrapTexture(),
    };
    textures.current = tex;
    const face = faceMatRef.current;
    const back = backMatRef.current;
    const strap = strapMatRef.current;
    if (face) {
      face.map = tex.front;
      face.needsUpdate = true;
    }
    if (back) {
      back.map = tex.back;
      back.needsUpdate = true;
    }
    if (strap) {
      strap.map = tex.strap;
      strap.useMap = 1;
      strap.side = DoubleSide;
      strap.toneMapped = false;
    }
    return () => {
      textures.current = null;
      tex.front.dispose();
      tex.back.dispose();
      tex.strap.dispose();
    };
  }, [gl]);

  /* draw the faces: on mount, when the photo arrives, when the fonts arrive, on language change */
  useEffect(() => {
    let cancelled = false;
    const redraw = () => {
      const tex = textures.current;
      if (cancelled || !tex) return;
      const family = readDisplayFamily();
      const fctx = (tex.front.image as HTMLCanvasElement).getContext("2d");
      const bctx = (tex.back.image as HTMLCanvasElement).getContext("2d");
      if (fctx) drawFront(fctx, imgRef.current, family, copy);
      if (bctx) drawBack(bctx, family, copy);
      tex.front.needsUpdate = true;
      tex.back.needsUpdate = true;
    };
    redraw();
    if (!imgRef.current) {
      const img = new Image();
      img.decoding = "async";
      img.src = profile.photos.mirror.src;
      img
        .decode()
        .then(() => {
          imgRef.current = img;
          redraw();
        })
        .catch(() => undefined);
    }
    const family = readDisplayFamily();
    if ("fonts" in document) {
      Promise.all([
        document.fonts.load(`700 100px ${family}`),
        document.fonts.load(`400 30px ${family}`),
        document.fonts.ready,
      ])
        .then(redraw)
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [copy, lang]);

  /* motion switch flipped at runtime: park the rope at rest (the sim keeps running for drags) */
  useEffect(() => {
    const s = sim.current;
    if (reduced && s.initialised) placeRope(s, true);
  }, [reduced]);

  /* pointer: hover + grab via R3F (the ray hits the card only), move/up via window */
  const planeHit = useMemo(() => {
    const origin = new Vector3();
    const dir = new Vector3();
    return (clientX: number, clientY: number, rigY: number, out: Vector3) => {
      const ndcX = (clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(clientY / window.innerHeight) * 2 + 1;
      origin.setFromMatrixPosition(camera.matrixWorld);
      dir.set(ndcX, ndcY, 0.5).unproject(camera).sub(origin).normalize();
      const tt = -origin.z / dir.z;
      out.set(origin.x + dir.x * tt, origin.y + dir.y * tt - rigY, 0);
      return out;
    };
  }, [camera]);

  useEffect(() => {
    const s = sim.current;
    const tmp = new Vector3();
    const onMove = (e: PointerEvent) => {
      if (!s.dragging || e.pointerId !== s.pointerId) return;
      planeHit(e.clientX, e.clientY, rigRef.current?.position.y ?? 0, tmp);
      s.target.copy(tmp).sub(s.grabOffset);
      s.target.z = 0.35; // lifts a little toward the camera while held
    };
    const end = (e: PointerEvent) => {
      if (!s.dragging || e.pointerId !== s.pointerId) return;
      s.dragging = false;
      s.pointerId = -1;
      const dt = performance.now() - s.downT;
      const moved = Math.hypot(e.clientX - s.downX, e.clientY - s.downY);
      if (dt < TAP_MS && moved < TAP_PX) {
        // a click without a drag: a small flick away from the hand
        const o = CARD_INDEX * 3;
        const dirX = s.grabOffset.x >= 0 ? -1 : 1;
        s.prev[o] += 0.05 * dirX;
        s.prev[o + 1] -= 0.02;
        s.prev[o + 2] -= 0.03;
        s.yaw += 0.6 * dirX;
      }
      setCursor(s.hovered ? "grab" : "");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setCursor("");
    };
  }, [planeHit]);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    const s = sim.current;
    if (!s.awake || s.dragging) return;
    e.stopPropagation();
    const o = CARD_INDEX * 3;
    const hit = planeHit(e.nativeEvent.clientX, e.nativeEvent.clientY, rigRef.current?.position.y ?? 0, new Vector3());
    s.grabOffset.set(hit.x - s.pos[o], hit.y - s.pos[o + 1], 0);
    // keep the grab inside the card so it never flies off the hand
    s.grabOffset.x = Math.max(-CARD_W * 0.45, Math.min(CARD_W * 0.45, s.grabOffset.x));
    s.grabOffset.y = Math.max(-CARD_H * 0.45, Math.min(CARD_H * 0.45, s.grabOffset.y));
    s.target.set(s.pos[o], s.pos[o + 1], 0.35);
    s.follow.set(s.pos[o], s.pos[o + 1], s.pos[o + 2]);
    s.dragging = true;
    s.pointerId = e.nativeEvent.pointerId;
    s.downX = e.nativeEvent.clientX;
    s.downY = e.nativeEvent.clientY;
    s.downT = performance.now();
    setCursor("grabbing");
  };
  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const s = sim.current;
    s.hovered = true;
    if (!s.dragging) setCursor("grab");
  };
  const onPointerOut = () => {
    const s = sim.current;
    s.hovered = false;
    if (!s.dragging) setCursor("");
  };

  /* frame */
  useFrame((state, dt) => {
    const s = sim.current;
    const rig = rigRef.current;
    const card = cardRef.current;
    const clip = clipRef.current;
    const strapGeo = strapGeoRef.current;
    const strapMat = strapMatRef.current;
    if (!rig || !card || !clip || !strapGeo || !strapMat) return;

    // layout follows the viewport; the rope re-settles on its own after a resize
    const { width, height } = state.size;
    if (!s.initialised || s.layout.width !== width || s.layout.height !== height) {
      s.layout = computeLayout(width, height);
      strapMat.resolution.set(width, height);
      if (!s.initialised) {
        placeRope(s, reduced);
        s.initialised = true;
      }
    }

    const vh = window.innerHeight || 1;
    const wpp = worldPerPixel(vh);
    rig.position.y = scrollState.y * wpp;
    // asleep once the whole rig has left through the top edge
    const awake = scrollState.y < vh * 1.35;
    s.awake = awake;
    rig.visible = awake;
    {
      const L = lanyardState;
      const lay = s.layout;
      L.ready = s.initialised;
      L.awake = awake;
      L.scale = lay.scale;
      L.cardHeight = CARD_H * lay.scale;
      L.viewW = lay.viewW;
      L.viewH = lay.viewH;
      L.restX = lay.anchorX;
      L.restY = lay.anchorY - lay.segLen * ROPE_SEGMENTS - lay.hangLen;
    }
    if (!awake) {
      if (s.dragging) {
        s.dragging = false;
        setCursor("");
      }
      return;
    }

    // the entrance starts after two smooth frames (first-frame shader compiles
    // would otherwise stall it mid-air), or after 2.5 s regardless
    if (!s.started) {
      s.waited += dt;
      s.smoothFrames = dt < 0.25 ? s.smoothFrames + 1 : 0;
      if (s.smoothFrames >= 2 || s.waited > 2.5) s.started = true;
    }

    // fixed-step simulation
    s.accumulator += Math.min(SUBSTEP * MAX_SUBSTEPS, dt);
    let n = 0;
    while (s.accumulator >= SUBSTEP && n < MAX_SUBSTEPS) {
      s.time += SUBSTEP;
      step(s, !reduced);
      s.accumulator -= SUBSTEP;
      n++;
    }

    const { pos, prev, layout, up, strap } = s;
    const e = (ROPE_POINTS - 1) * 3;
    const c = CARD_INDEX * 3;

    // card pose: hang along strap end → centre, yaw from lateral speed, pitch from vertical
    up.set(pos[c] - pos[e], pos[c + 1] - pos[e + 1], pos[c + 2] - pos[e + 2]).normalize();
    const roll = Math.atan2(up.x, -up.y);
    const vx = (pos[c] - prev[c]) / SUBSTEP;
    const vy = (pos[c + 1] - prev[c + 1]) / SUBSTEP;
    const vz = (pos[c + 2] - prev[c + 2]) / SUBSTEP;
    lanyardState.x = pos[c];
    lanyardState.y = pos[c + 1];
    lanyardState.z = pos[c + 2];
    lanyardState.speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    lanyardState.roll = roll;
    const idle = reduced ? 0 : Math.sin(s.time * SWAY_OMEGA) * 0.07 + Math.sin(s.time * SWAY_OMEGA * 2.7) * 0.015;
    const yawTarget = Math.max(-0.9, Math.min(0.9, -vx * 0.16)) + idle;
    const pitchTarget = Math.max(-0.35, Math.min(0.35, vy * 0.05));
    const k = 1 - Math.exp(-dt * 7);
    s.yaw += (yawTarget - s.yaw) * k;
    s.pitch += (pitchTarget - s.pitch) * k;

    card.position.set(pos[c], pos[c + 1], pos[c + 2]);
    card.rotation.set(s.pitch, s.yaw, roll, "ZYX");
    card.scale.setScalar(layout.scale);

    // clip at the strap end, aligned with the last rope segment
    const p = (ROPE_POINTS - 2) * 3;
    const segRoll = Math.atan2(pos[e] - pos[p], -(pos[e + 1] - pos[p + 1]));
    clip.position.set(pos[e], pos[e + 1], pos[e + 2]);
    clip.rotation.set(0, s.yaw * 0.5, segRoll);
    clip.scale.setScalar(layout.scale);

    // strap: the rope points plus a short run into the ring
    for (let i = 0; i < ROPE_POINTS; i++) {
      strap[i * 3] = pos[i * 3];
      strap[i * 3 + 1] = pos[i * 3 + 1];
      strap[i * 3 + 2] = pos[i * 3 + 2] + 0.02;
    }
    const last = ROPE_POINTS * 3;
    strap[last] = pos[e] + up.x * RING_R * 0.6;
    strap[last + 1] = pos[e + 1] + up.y * RING_R * 0.6;
    strap[last + 2] = pos[e + 2] + 0.02;
    strapGeo.setPoints(strap);
    strapMat.repeat.x = Math.max(6, (layout.segLen * ROPE_SEGMENTS) / 0.22);

    if (lightRef.current) {
      // on the clip side, above the card: lights strap, ring and card edges, not the photo
      lightRef.current.position.set(pos[e] + 0.9, pos[e + 1] + 0.6, 1.6);
    }
  });

  return (
    <group ref={rigRef}>
      <mesh frustumCulled={false}>
        <MeshLineGeometryEl ref={strapGeoRef} />
        <MeshLineMaterialEl ref={strapMatRef} args={STRAP_ARGS} />
      </mesh>
      <group ref={clipRef}>
        <mesh>
          <boxGeometry args={[0.18, 0.11, 0.05]} />
          <meshStandardMaterial color={CHROME} metalness={1} roughness={0.3} />
        </mesh>
        <mesh position={[0, -RING_R, 0.02]}>
          <torusGeometry args={[RING_R, 0.016, 10, 40]} />
          <meshStandardMaterial color={CHROME} metalness={1} roughness={0.3} />
        </mesh>
      </group>
      <group
        ref={cardRef}
        name="badge"
        onPointerDown={onPointerDown}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <mesh position={[0, 0, -CARD_D / 2]}>
          <extrudeGeometry args={[CARD_SHAPE, EXTRUDE]} />
          <meshPhysicalMaterial
            color={INK_3}
            roughness={0.38}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.3}
            emissive={SAND}
            emissiveIntensity={0.1}
          />
        </mesh>
        <mesh position={[0, 0, CARD_D / 2 + 0.009]}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          {/* unlit so the photograph keeps its real colours whatever the scene light does */}
          <meshBasicMaterial ref={faceMatRef} transparent alphaTest={0.5} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -(CARD_D / 2 + 0.009)]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshPhysicalMaterial
            ref={backMatRef}
            transparent
            alphaTest={0.5}
            roughness={0.34}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.3}
          />
        </mesh>
      </group>
      <pointLight ref={lightRef} color={NEON} intensity={1.6} distance={4.5} decay={2} />
    </group>
  );
}
