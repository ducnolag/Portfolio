"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  type Group,
  LatheGeometry,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  Path,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  type Sprite,
  type SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useDeviceTier, useReducedMotion } from "@/lib/hooks";
import { heldProgress, scrollState } from "@/lib/scroll";
import { companionState } from "./companionState";
import { stickyStageTop, visibleHeightAtZ, worldPerPixel } from "./worldScale";

/* ─────────────────────────────────────────────────────────────
   "Lag", the build companion: a glossy TV-headed robot with an LED-matrix
   face, knob ears, a springy antenna with a state light, screws and a
   vented back panel. Proportions, face patterns, motion springs and the
   state lights follow fayazara/robot-heads (MIT) — its "rectangle" TV head
   — rebuilt here as real geometry in our world.
   Head units: width 1 (hx 0.5), height 0.76 (hy 0.38), depth 0.6; y up.
   ───────────────────────────────────────────────────────────── */

const SECTION_SELECTOR = '[data-scene="companion"]';

/* ── proportions (robot-heads geometry.ts, "rectangle") ───────── */
const HX = 0.5, HY = 0.38, DEPTH = 0.6, CORNER = 0.21;
const BEVEL = 0.075, MARGIN = 0.045, GASKET = 0.022, RECESS = 0.03;
const INSET_PLATE = BEVEL, INSET_HOLE = BEVEL + MARGIN, INSET_GLASS = BEVEL + MARGIN + GASKET;
const EAR_Y = -0.03; // robot-heads' earY is 0.03 with y down
const STEM = 0.2, BALL = 0.052;
const GLASS_W = 2 * (HX - INSET_GLASS), GLASS_H = 2 * (HY - INSET_GLASS);
const FACE_COLS = 22, FACE_ROWS = 14;
const PITCH = Math.min((0.6 * GLASS_W) / 14, (0.65 * GLASS_H) / 10);

/* ── palette ──────────────────────────────────────────────────── */
const SHELL = "#7c3aed";
const SHELL_TOP = "#9d66f6";
const TRIM = "#9c92c4";
const BEZEL = "#120e22";
const LED: Rgb = [239, 234, 252]; // fg

type Rgb = [number, number, number];
type RobotState = "idle" | "thinking" | "searching" | "listening" | "speaking" | "working" | "happy" | "error" | "sleeping";

/* state lights (robot-heads light.ts), kept in our palette */
const LIGHTS: Record<RobotState, { ball: Rgb; pulse: (t: number) => number }> = {
  idle: { ball: [192, 132, 252], pulse: (t) => 0.75 + 0.1 * Math.sin(t * 1.4) },
  thinking: { ball: [245, 169, 82], pulse: (t) => 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 4.2)) },
  searching: { ball: [91, 140, 255], pulse: (t) => ((t * 2.4) % 1 < 0.18 ? 1 : 0.25) },
  listening: { ball: [91, 255, 176], pulse: () => 0.95 },
  speaking: { ball: [91, 140, 255], pulse: (t) => 0.55 + 0.45 * noise(t * 11) },
  working: { ball: [91, 140, 255], pulse: (t) => ((t * 1.7) % 1 < 0.5 ? 1 : 0.35) },
  happy: { ball: [91, 255, 176], pulse: (t) => 0.8 + 0.2 * Math.sin(t * 8) },
  error: { ball: [255, 60, 50], pulse: (t) => ((t * 3) % 1 < 0.5 ? 1 : 0.15) },
  sleeping: { ball: [192, 132, 252], pulse: () => 0 },
};

/* ── faces (robot-heads faces.ts) ─────────────────────────────── */
type FaceParams = { lookX: number; lookY: number; blink: number; time: number; side: number; seed: number };
type Grid = { v: Float32Array; cols: number; rows: number; ox: number; oy: number };

function makeGrid(cols: number, rows: number): Grid {
  const c = FACE_COLS + 2 * Math.max(0, Math.ceil((cols - FACE_COLS) / 2));
  const r = FACE_ROWS + 2 * Math.max(0, Math.ceil((rows - FACE_ROWS) / 2));
  return { v: new Float32Array(c * r), cols: c, rows: r, ox: (c - FACE_COLS) / 2, oy: (r - FACE_ROWS) / 2 };
}
const put = (g: Grid, c: number, r: number, v: number) => {
  const x = c + g.ox, y = r + g.oy;
  if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) return;
  const i = y * g.cols + x;
  if (v > g.v[i]) g.v[i] = v;
};
const rect = (g: Grid, c: number, r: number, w: number, h: number, v: number) => {
  for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) put(g, x, y, v);
};
const sprite = (g: Grid, c: number, r: number, rows: string[], v: number) => {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "#") put(g, c + x, r + y, v);
      else if (row[x] === "+") put(g, c + x, r + y, v * 0.5);
    }
  });
};
const EYE_L = 6, EYE_R = 13, EYE_TOP = 5;
function eyes(g: Grid, f: FaceParams, h = 4, v = 1, dy = 0, lid = 0) {
  const dx = Math.round(f.lookX);
  const ly = Math.round(f.lookY) + dy;
  const open = Math.max(1, Math.round(h - (h - 1) * f.blink));
  const top = EYE_TOP + Math.floor((4 - h) / 2) + ly + Math.floor((h - open) / 2);
  for (const c of [EYE_L, EYE_R]) {
    if (lid > 0 && open > 1) {
      rect(g, c + dx, top, 3, 1, v * (1 - lid));
      rect(g, c + dx, top + 1, 3, open - 1, v);
    } else rect(g, c + dx, top, 3, open, v);
  }
}
function noise(x: number) {
  return 0.5 + 0.25 * Math.sin(x * 1.7) + 0.15 * Math.sin(x * 3.1 + 1.3) + 0.1 * Math.sin(x * 5.3 + 4.1);
}
const CARET = ["..#..", ".#.#.", "#...#"];
const CROSS = ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"];
const Z_BIG = ["####", "..#.", ".#..", "####"];
const Z_SMALL = ["###", ".#.", "###"];

const FACES: Record<RobotState, (g: Grid, f: FaceParams) => void> = {
  idle(g, f) {
    eyes(g, f);
  },
  thinking(g, f) {
    eyes(g, { ...f, lookX: f.lookX + f.side * 1.4, lookY: f.lookY - 1.2 }, 3, 1, 0, 0.45);
    for (let i = 0; i < 3; i++) {
      const p = (f.time * 1.6 - i * 0.22) % 1;
      const pulse = p < 0.35 ? Math.sin((p / 0.35) * Math.PI) : 0;
      rect(g, 6 + i * 4, 11 - (pulse > 0.5 ? 1 : 0), 2, 2, 0.28 + 0.72 * pulse);
    }
  },
  searching(g, f) {
    eyes(g, f);
    const first = -g.ox, last = FACE_COLS - 1 + g.ox;
    const sweep = first + (Math.sin(f.time * 1.6 + 0.4) * 0.5 + 0.5) * (last - first);
    const dir = Math.cos(f.time * 1.6 + 0.4) > 0 ? -1 : 1;
    for (let k = 0; k < 5; k++) {
      const c = Math.round(sweep + dir * k);
      const v = 0.32 * (1 - k / 5);
      for (let r = -g.oy; r < FACE_ROWS + g.oy; r++) put(g, c, r, v);
    }
  },
  listening(g, f) {
    eyes(g, f, 4, 1, -1);
    for (let i = 0; i < 12; i++) {
      const centre = 1 - Math.abs(i - 5.5) / 7;
      const level = noise(f.time * 7 + i * 1.9 + f.seed * 10) * centre;
      const h = Math.max(1, Math.round(level * 4));
      for (let k = 0; k < h; k++) put(g, 5 + i, 12 - k, 0.75 - k * 0.12);
    }
  },
  speaking(g, f) {
    eyes(g, f, 4, 1, -1);
    const env = Math.max(0, Math.sin(f.time * 2.1) * 0.5 + Math.sin(f.time * 3.7 + 1) * 0.5);
    for (let i = 0; i < 8; i++) {
      const centre = 1 - Math.abs(i - 3.5) / 5;
      const a = noise(f.time * 11 + i * 0.9) * centre * (0.35 + env);
      const h = a > 0.55 ? 3 : a > 0.28 ? 2 : 1;
      rect(g, 7 + i, h === 3 ? 10 : 11, 1, h === 3 ? 3 : h === 2 ? 2 : 1, 1);
    }
  },
  working(g, f) {
    eyes(g, { ...f, lookY: f.lookY + 1 }, 2, 1, 0);
    const fill = Math.round(((f.time / 2.6) % 1) * 12);
    for (let i = 0; i < 12; i++) put(g, 5 + i, 11, i < fill ? 0.95 : 0.16);
    put(g, 4, 11, 0.4);
    put(g, 17, 11, 0.4);
  },
  happy(g, f) {
    const hop = Math.round(Math.max(0, Math.sin(f.time * 5.6)) * -1);
    sprite(g, EYE_L - 1, EYE_TOP + hop, CARET, 1);
    sprite(g, EYE_R - 1, EYE_TOP + hop, CARET, 1);
    sprite(g, 7, 10 + hop, ["#......#", ".######."], 0.9);
  },
  error(g, f) {
    const on = Math.sin(f.time * 7) > -0.6 ? 1 : 0.55;
    sprite(g, EYE_L - 1, 4, CROSS, on);
    sprite(g, EYE_R - 1, 4, CROSS, on);
    for (let i = 0; i < 8; i++) put(g, 7 + i, i % 2 ? 11 : 12, 0.8);
  },
  sleeping(g, f) {
    for (const c of [EYE_L, EYE_R]) {
      put(g, c - 1, 7, 0.32);
      rect(g, c, 8, 3, 1, 0.42);
      put(g, c + 3, 7, 0.32);
    }
    for (const [delay, big] of [[0, true], [1.1, false]] as const) {
      const p = ((f.time + delay) / 2.2) % 1;
      const v = Math.sin(p * Math.PI) * 0.6;
      sprite(g, 16 + Math.round(p * 2), Math.round(5 - p * 5), big ? Z_BIG : Z_SMALL, v);
    }
  },
};

/* ── motion (robot-heads sim.ts) ──────────────────────────────── */
class Spring {
  x = 0;
  v = 0;
  step(target: number, dt: number, freq: number, damping: number) {
    const w = freq * Math.PI * 2;
    this.v += (w * w * (target - this.x) - 2 * damping * w * this.v) * dt;
    this.x += this.v * dt;
  }
}
function rng(seed: number) {
  let a = Math.floor(seed * 4294967295) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

type Jump = { age: number; height: number; spin: number; lean: number; air: number; landed: boolean };
type Pose = { yaw: number; pitch: number; roll: number; x: number; lift: number; sx: number; sy: number; antennaX: number; antennaZ: number };
const CROUCH = 0.11;

class RobotSim {
  state: RobotState;
  shown: RobotState;
  previous: RobotState;
  switched = 10;
  age = 0;
  time = 0;
  since = 0;
  pose: Pose = { yaw: 0, pitch: 0, roll: 0, x: 0, lift: 0, sx: 1, sy: 1, antennaX: 0, antennaZ: 0 };
  face: FaceParams;
  /** the pointer relative to the head's centre, in head widths × 160 (robot-heads' px scale) */
  pointer: { x: number; y: number } | null = null;
  private yaw = new Spring();
  private pitch = new Spring();
  private roll = new Spring();
  private sway = new Spring();
  private squash = new Spring();
  private antX = new Spring();
  private antZ = new Spring();
  private lastV = { roll: 0, pitch: 0, sway: 0 };
  private jump: Jump | null = null;
  private random: () => number;
  private lookAt = { yaw: 0, pitch: 0, x: 0, y: 0 };
  private nextLook = 0.6;
  private nextBlink = 1.5;
  private blinkAge = -1;
  private nextHop = 8;
  private nextSide = 4;
  private reactUntil = -1;
  private nextNod = 2.5;

  constructor(seed: number, state: RobotState) {
    this.random = rng(seed);
    this.state = this.shown = this.previous = state;
    this.face = { lookX: 0, lookY: 0, blink: 0, time: 0, side: 1, seed };
    this.nextBlink = 1 + this.random() * 3;
    this.nextHop = 6 + this.random() * 6;
  }
  setState(s: RobotState) {
    if (s === this.state) return;
    this.state = s;
    this.since = 0;
    this.nextLook = 0;
    this.nextHop = this.time + (s === "happy" ? 0.2 : 3 + this.random() * 4);
    if (s === "happy") this.hop(0.22, 1);
  }
  /** a click: a hop with a full turn and a happy face */
  poke() {
    this.hop(0.24, this.random() < 0.5 ? 1 : -1);
    this.reactUntil = this.time + 1.6;
  }
  /** a reaction face shown over the state for `seconds` */
  react(seconds: number) {
    this.reactUntil = this.time + seconds;
  }
  reacting() {
    return this.time < this.reactUntil;
  }
  hop(height: number, spin: number) {
    if (this.jump) return;
    this.jump = { age: 0, height, spin, lean: (this.random() - 0.5) * 0.3, air: 0.42 + height * 0.45, landed: false };
  }
  update(dt: number, reaction: RobotState) {
    if (!(dt > 0)) return;
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < steps; i++) this.step(dt / steps, reaction);
  }
  private step(dt: number, reaction: RobotState) {
    this.time += dt;
    this.since += dt;
    this.age += dt;
    this.switched += dt;
    const t = this.time;
    const rand = this.random;
    const shown: RobotState = t < this.reactUntil ? reaction : this.state;
    if (shown !== this.shown) {
      this.previous = this.shown;
      this.shown = shown;
      this.switched = 0;
    }
    let yaw = 0, pitch = 0, roll = 0;
    const sway = 0;
    let bob = Math.sin(t * 1.9) * 0.008;
    let lookX = 0, lookY = 0;
    let freq = 1.3, damping = 0.62;
    let shake = 0;
    const p = this.pointer;
    const follows = p && (this.state === "idle" || this.state === "listening" || this.state === "happy" || this.state === "speaking");
    if (t > this.nextLook) {
      this.lookAt = { yaw: (rand() - 0.5) * 0.75, pitch: (rand() - 0.5) * 0.24, x: 0, y: 0 };
      this.lookAt.x = clamp(Math.round(this.lookAt.yaw * 5), -2, 2);
      this.lookAt.y = rand() < 0.3 ? -1 : rand() < 0.2 ? 1 : 0;
      this.nextLook = t + 1.4 + rand() * 2.6;
    }
    switch (this.state) {
      case "idle":
        yaw = this.lookAt.yaw;
        pitch = this.lookAt.pitch;
        roll = -this.lookAt.yaw * 0.16;
        lookX = this.lookAt.x;
        lookY = this.lookAt.y;
        if (t > this.nextHop) {
          this.hop(0.15 + rand() * 0.07, rand() < 0.35 ? (rand() < 0.5 ? 1 : -1) : 0);
          this.nextHop = t + 7 + rand() * 7;
        }
        break;
      case "thinking": {
        if (t > this.nextSide) {
          this.face.side = -this.face.side;
          this.nextSide = t + 3 + rand() * 2;
        }
        const s = this.face.side;
        yaw = 0.24 * s + Math.sin(t * 0.9) * 0.05;
        pitch = 0.17 + Math.sin(t * 1.3) * 0.03;
        roll = -0.13 * s;
        freq = 0.9;
        break;
      }
      case "searching": {
        const ph = t * 1.6;
        yaw = Math.sin(ph) * 0.55;
        pitch = -0.04 + Math.sin(ph * 2) * 0.04;
        roll = Math.sin(ph) * -0.06;
        lookX = clamp(Math.sin(ph + 0.4) * 3, -3, 3);
        freq = 2.2;
        damping = 0.8;
        break;
      }
      case "listening":
        yaw = -0.14;
        pitch = 0.02;
        roll = 0.17;
        if (t > this.nextNod) {
          this.pitch.v -= 0.9;
          this.nextNod = t + 2 + rand() * 2.5;
        }
        break;
      case "speaking":
        yaw = Math.sin(t * 0.7) * 0.12;
        pitch = 0.03 + Math.sin(t * 6.3) * 0.025 * (0.5 + 0.5 * Math.sin(t * 2.1));
        roll = Math.sin(t * 0.9) * 0.05;
        bob += Math.abs(Math.sin(t * 6.3)) * 0.01;
        freq = 1.8;
        break;
      case "working":
        yaw = Math.sin(t * 0.8) * 0.08;
        pitch = -0.16;
        roll = Math.sin(t * 0.5) * 0.04;
        bob += Math.abs(Math.sin(t * 7)) * 0.012;
        if (t > this.nextHop) {
          this.hop(0.2, rand() < 0.5 ? 1 : -1);
          this.nextHop = t + 5 + rand() * 3;
        }
        break;
      case "happy":
        yaw = Math.sin(t * 2.2) * 0.18;
        roll = Math.sin(t * 4.4) * 0.12;
        pitch = 0.08;
        if (t > this.nextHop) {
          this.hop(0.17, rand() < 0.34 ? (rand() < 0.5 ? 1 : -1) : 0);
          this.nextHop = t + 1.05 + rand() * 0.4;
        }
        break;
      case "error": {
        const c = (t % 2.4) / 0.7;
        shake = c < 1 ? Math.sin(c * Math.PI * 7) * 0.22 * (1 - c) : 0;
        pitch = -0.06;
        roll = -0.05;
        freq = 1.6;
        break;
      }
      case "sleeping":
        pitch = -0.34;
        roll = 0.13;
        yaw = 0.06;
        bob = Math.sin(t * 1.15) * 0.016;
        freq = 0.55;
        damping = 0.9;
        if (t > this.nextNod) {
          this.pitch.v -= 0.5;
          this.nextNod = t + 5 + rand() * 4;
        }
        break;
    }
    if (follows && p) {
      yaw = clamp(p.x / 260, -1, 1) * 0.55;
      pitch = -clamp(p.y / 260, -1, 1) * 0.32;
      roll = -yaw * 0.12 + (this.state === "listening" ? 0.12 : 0);
      lookX = clamp(p.x / 120, -2.4, 2.4);
      lookY = clamp(p.y / 160, -1.4, 1.4);
    }
    this.yaw.step(yaw, dt, freq, damping);
    this.pitch.step(pitch, dt, freq, damping);
    this.roll.step(roll, dt, freq, damping);
    this.sway.step(sway, dt, 1.2, 0.7);

    let lift = 0, spin = 0, lean = 0;
    let squashTarget = 0;
    const j = this.jump;
    if (j) {
      j.age += dt;
      if (j.age < CROUCH) squashTarget = 0.14;
      else {
        const ap = (j.age - CROUCH) / j.air;
        if (ap < 1) {
          if (ap < 0.06 && this.squash.x > 0.05) {
            this.squash.v = -2.6;
            this.antZ.v -= 3;
          }
          lift = 4 * j.height * ap * (1 - ap);
          spin = j.spin * Math.PI * 2 * easeInOut(clamp(ap * 1.08, 0, 1));
          lean = j.lean * Math.sin(ap * Math.PI);
          squashTarget = ap < 0.5 ? -0.05 : 0;
        } else if (!j.landed) {
          j.landed = true;
          this.squash.v += 3.2;
          this.antX.v += (rand() < 0.5 ? -1 : 1) * (2.5 + rand() * 2);
          this.antZ.v += 3.5;
        } else if (j.age - CROUCH - j.air > 0.35) this.jump = null;
      }
    }
    this.squash.step(squashTarget, dt, 3.2, 0.32);

    if (t > this.nextBlink) {
      this.blinkAge = 0;
      this.nextBlink = t + 2.2 + rand() * 3.5;
      if (rand() < 0.2) this.nextBlink = t + 0.35;
    }
    let blink = 0;
    if (this.blinkAge >= 0) {
      this.blinkAge += dt;
      blink = Math.sin(clamp(this.blinkAge / 0.17, 0, 1) * Math.PI);
      if (this.blinkAge > 0.17) this.blinkAge = -1;
    }

    const rollAcc = (this.roll.v - this.lastV.roll) / dt;
    const pitchAcc = (this.pitch.v - this.lastV.pitch) / dt;
    const swayAcc = (this.sway.v - this.lastV.sway) / dt;
    this.lastV = { roll: this.roll.v, pitch: this.pitch.v, sway: this.sway.v };
    this.antX.v -= (rollAcc * 0.05 + swayAcc * 0.3) * dt * 6;
    this.antZ.v -= pitchAcc * 0.05 * dt * 6;
    this.antX.step(0, dt, 2.3, 0.09);
    this.antZ.step(0, dt, 2.3, 0.09);
    this.antX.x = clamp(this.antX.x, -0.7, 0.7);
    this.antZ.x = clamp(this.antZ.x, -0.7, 0.7);

    const sq = this.squash.x;
    this.pose = {
      yaw: this.yaw.x + spin + shake,
      pitch: this.pitch.x,
      roll: this.roll.x + lean,
      x: this.sway.x,
      lift: lift + bob,
      sx: 1 + sq * 0.55,
      sy: 1 - sq,
      antennaX: this.antX.x,
      antennaZ: this.antZ.x,
    };
    this.face.lookX = lookX;
    this.face.lookY = lookY;
    this.face.blink = this.state === "sleeping" ? 0 : blink;
    this.face.time = this.since;
  }
  get jumping() {
    return this.jump !== null;
  }
}

/* ── the LED matrix for this frame (robot-heads render.ts compose) ── */
function compose(sim: RobotSim, grid: Grid, prev: Grid) {
  const g = grid.v;
  const { cols, rows } = grid;
  g.fill(0);
  FACES[sim.shown](grid, sim.face);
  if (sim.switched < 0.3) {
    prev.v.fill(0);
    FACES[sim.previous](prev, { ...sim.face, time: sim.face.time + 10 });
    const k = sim.switched / 0.3;
    for (let i = 0; i < g.length; i++) g[i] = g[i] * k + prev.v[i] * (1 - k);
    if (sim.switched < 0.13) {
      const seed = Math.floor(sim.time * 30);
      for (let r = 0; r < rows; r++) {
        const shift = Math.floor((Math.sin(seed * 12.9 + r * 78.2) * 0.5 + 0.5) * 3) - 1;
        if (!shift) continue;
        const row = g.slice(r * cols, (r + 1) * cols);
        for (let c = 0; c < cols; c++) g[r * cols + c] = row[(c - shift + cols) % cols];
      }
      for (let i = 0; i < g.length; i++) if (Math.sin(i * 91.7 + seed * 3.1) > 0.93) g[i] = Math.max(g[i], 0.3);
    }
  }
  if (sim.age < 0.55) {
    const open = smooth(0.08, 0.5, sim.age) * (rows / 2 + 0.5);
    for (let r = 0; r < rows; r++) {
      const d = Math.abs(r - (rows - 1) / 2);
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (d > open) g[i] = 0;
        else if (d > open - 1.2) g[i] = Math.max(g[i], 0.85 * (1 - sim.age / 0.55));
      }
    }
  }
}

/* ── the screen texture ───────────────────────────────────────── */
const CELL_PX = 12;

type Screen = {
  tex: CanvasTexture;
  ctx: CanvasRenderingContext2D;
  base: HTMLCanvasElement;
  tiny: HTMLCanvasElement;
  tinyImg: ImageData;
  grid: Grid;
  prev: Grid;
  last: Float32Array;
  lastDraw: number;
};

function makeScreen(cols: number, rows: number): Screen | null {
  const grid = makeGrid(cols, rows);
  const w = grid.cols * CELL_PX, h = grid.rows * CELL_PX;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const base = document.createElement("canvas");
  base.width = w;
  base.height = h;
  const bctx = base.getContext("2d");
  const tiny = document.createElement("canvas");
  tiny.width = grid.cols;
  tiny.height = grid.rows;
  const tctx = tiny.getContext("2d");
  if (!ctx || !bctx || !tctx) return null;
  /* the dark screen with its grid of unlit lenses, drawn once */
  bctx.fillStyle = "#0a0914";
  bctx.fillRect(0, 0, w, h);
  const lens = CELL_PX * 0.8, off = (CELL_PX - lens) / 2;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      bctx.fillStyle = "rgba(44,40,66,0.3)";
      bctx.fillRect(c * CELL_PX + off, r * CELL_PX + off, lens, lens);
      bctx.fillStyle = "rgba(120,110,160,0.14)";
      bctx.fillRect(c * CELL_PX + off, r * CELL_PX + off, lens, 1);
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, ctx, base, tiny, tinyImg: tctx.createImageData(grid.cols, grid.rows), grid, prev: makeGrid(cols, rows), last: new Float32Array(grid.v.length).fill(-1), lastDraw: -1 };
}

function drawScreen(s: Screen, led: Rgb) {
  const { ctx, grid, base, tiny } = s;
  const { cols, rows, v: g } = grid;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.drawImage(base, 0, 0);
  const core = mix(led, [255, 255, 255], 0.6);
  const coreCss = `rgb(${core.map(Math.round).join(",")})`;
  const bleedCss = `rgb(${led.map(Math.round).join(",")})`;
  const cell = CELL_PX * 0.8, off = (CELL_PX - cell) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = g[r * cols + c];
      if (v < 0.01) continue;
      ctx.globalAlpha = Math.min(1, v * 0.4);
      ctx.fillStyle = bleedCss;
      ctx.fillRect(c * CELL_PX + off * 0.4, r * CELL_PX + off * 0.4, CELL_PX - off * 0.8, CELL_PX - off * 0.8);
      ctx.globalAlpha = Math.min(1, v);
      ctx.fillStyle = coreCss;
      ctx.fillRect(c * CELL_PX + off, r * CELL_PX + off, cell, cell);
    }
  }
  /* bloom: the matrix at one pixel per LED, scaled up smooth */
  const d = s.tinyImg.data;
  for (let i = 0; i < cols * rows; i++) {
    d[i * 4] = led[0];
    d[i * 4 + 1] = led[1];
    d[i * 4 + 2] = led[2];
    d[i * 4 + 3] = Math.round(Math.min(1, g[i]) * 255);
  }
  const tctx = tiny.getContext("2d");
  if (tctx) {
    tctx.putImageData(s.tinyImg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55;
    ctx.drawImage(tiny, -CELL_PX, -CELL_PX, (cols + 2) * CELL_PX, (rows + 2) * CELL_PX);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  s.tex.needsUpdate = true;
}

/* ── geometry ─────────────────────────────────────────────────── */
function roundedRect(hx: number, hy: number, r: number): Shape {
  const s = new Shape();
  s.moveTo(-hx + r, -hy);
  s.lineTo(hx - r, -hy);
  s.absarc(hx - r, -hy + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hx, hy - r);
  s.absarc(hx - r, hy - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hx + r, hy);
  s.absarc(-hx + r, hy - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hx, -hy + r);
  s.absarc(-hx + r, -hy + r, r, Math.PI, Math.PI * 1.5, false);
  s.closePath();
  return s;
}
function roundedRectPath(hx: number, hy: number, r: number): Path {
  const p = new Path();
  p.moveTo(-hx + r, -hy);
  p.lineTo(hx - r, -hy);
  p.absarc(hx - r, -hy + r, r, -Math.PI / 2, 0, false);
  p.lineTo(hx, hy - r);
  p.absarc(hx - r, hy - r, r, 0, Math.PI / 2, false);
  p.lineTo(-hx + r, hy);
  p.absarc(-hx + r, hy - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(-hx, -hy + r);
  p.absarc(-hx + r, -hy + r, r, Math.PI, Math.PI * 1.5, false);
  p.closePath();
  return p;
}

/** The shell: the outline extruded through the depth with a rolled edge front and back, the screen hole through it. */
function buildShell(): ExtrudeGeometry {
  const shape = roundedRect(HX - BEVEL, HY - BEVEL, CORNER - BEVEL);
  shape.holes.push(roundedRectPath(HX - INSET_HOLE, HY - INSET_HOLE, CORNER - INSET_HOLE));
  const g = new ExtrudeGeometry(shape, {
    depth: DEPTH - 2 * BEVEL,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL - 0.001,
    bevelSegments: 6,
    curveSegments: 14,
  });
  g.translate(0, 0, -(DEPTH - 2 * BEVEL) / 2);
  /* a lighter top: vertex colours from the shell colour to its highlight */
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const a = new Color(SHELL), b = new Color(SHELL_TOP), c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const t = clamp(pos.getY(i) / HY * 0.5 + 0.5, 0, 1);
    c.copy(a).lerp(b, t * t * 0.9);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

const EAR_PROFILE: Array<[number, number]> = [
  [0.06, -0.012], [0.068, 0], [0.074, 0.006], [0.08, 0.018], [0.084, 0.032], [0.084, 0.048],
  [0.079, 0.06], [0.068, 0.07], [0.052, 0.077], [0.032, 0.081], [0.014, 0.083], [0, 0.0835],
];
const COLLAR_PROFILE: Array<[number, number]> = [
  [0.05, -0.012], [0.052, 0.006], [0.05, 0.016], [0.042, 0.024], [0.026, 0.029], [0.014, 0.031], [0, 0.032],
];
/** A lathe from a [radius, along-axis] profile, axis +y, then oriented. */
function lathe(profile: Array<[number, number]>, segments: number): LatheGeometry {
  const pts = profile.map(([r, t]) => new Vector2(r, t));
  return new LatheGeometry(pts, segments);
}

/* ── component ────────────────────────────────────────────────── */
type Live = {
  sim: RobotSim;
  screen: Screen | null;
  tx: number;
  ty: number;
  px: number;
  py: number;
  gazeYaw: number;
  gazePitch: number;
  searchUntil: number;
  scrollState: RobotState;
  /** own scroll speed estimate (px/s, smoothed, decays when no scroll events arrive) */
  lastY: number;
  speed: number;
  headPx: Vector3;
  ballColor: Color;
};

export function Companion() {
  const reduced = useReducedMotion();
  const tier = useDeviceTier();
  const rootRef = useRef<Group>(null);
  const rigRef = useRef<Group>(null); // glide position
  const headRef = useRef<Group>(null); // pose (squash about the bottom)
  const poseRef = useRef<Group>(null);
  const antennaRef = useRef<Group>(null);
  const ballMatRef = useRef<MeshStandardMaterial>(null);
  const screenMatRef = useRef<MeshBasicMaterial>(null);
  const glassRef = useRef<Mesh>(null);
  const shadowRef = useRef<Sprite>(null);
  const shadowMatRef = useRef<SpriteMaterial>(null);
  const haloRef = useRef<Sprite>(null);
  const haloMatRef = useRef<SpriteMaterial>(null);
  const sectionRef = useRef<Element | null>(null);
  const live = useRef<Live>({
    sim: new RobotSim(0.37, "idle"),
    screen: null,
    tx: 0, ty: 0, px: 0, py: 0,
    gazeYaw: 0, gazePitch: 0,
    searchUntil: -1,
    scrollState: "idle",
    lastY: 0,
    speed: 0,
    headPx: new Vector3(),
    ballColor: new Color(),
  });

  const geo = useMemo(() => {
    const earX = HX - 0.008;
    const earL = lathe(EAR_PROFILE, 36).rotateZ(Math.PI / 2).translate(-earX, EAR_Y, 0);
    const earR = lathe(EAR_PROFILE, 36).rotateZ(-Math.PI / 2).translate(earX, EAR_Y, 0);
    const screwDiag = CORNER - (INSET_HOLE - 0.018 + INSET_PLATE) / 2;
    const d = Math.SQRT1_2 * screwDiag;
    const screws = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        screws.push(new CylinderGeometry(0.016, 0.016, 0.012, 12).rotateX(Math.PI / 2).translate(sx * (0.29 + d), sy * (0.17 + d), DEPTH / 2 - 0.002));
        screws.push(new CylinderGeometry(0.016, 0.016, 0.012, 12).rotateX(Math.PI / 2).translate(sx * (0.29 + d - 0.04), sy * (0.17 + d - 0.04), -DEPTH / 2 + 0.002));
      }
    }
    /* the back panel with five vent slots */
    const back = roundedRect(HX - INSET_PLATE - 0.01, HY - INSET_PLATE - 0.01, CORNER - INSET_PLATE - 0.01);
    for (const vy of [-0.12, -0.065, -0.01, 0.045, 0.1]) {
      const slot = new Path();
      const r = 0.012, hl = 0.196;
      slot.moveTo(-hl, vy - r);
      slot.lineTo(hl, vy - r);
      slot.absarc(hl, vy, r, -Math.PI / 2, Math.PI / 2, false);
      slot.lineTo(-hl, vy + r);
      slot.absarc(-hl, vy, r, Math.PI / 2, Math.PI * 1.5, false);
      back.holes.push(slot);
    }
    const bezel = roundedRect(HX - INSET_HOLE + 0.002, HY - INSET_HOLE + 0.002, CORNER - INSET_HOLE + 0.002);
    bezel.holes.push(roundedRectPath(HX - INSET_GLASS, HY - INSET_GLASS, Math.max(0.02, CORNER - INSET_GLASS)));
    return {
      shell: buildShell(),
      ears: mergeGeometries([earL, earR]) as BufferGeometry,
      collar: lathe(COLLAR_PROFILE, 20).translate(0, HY - 0.004, 0),
      stem: new CylinderGeometry(0.007, 0.01, STEM, 8).translate(0, STEM / 2, 0),
      ball: new SphereGeometry(BALL, 20, 14),
      screws: mergeGeometries(screws) as BufferGeometry,
      back: new ShapeGeometry(back, 10).rotateY(Math.PI).translate(0, 0, -DEPTH / 2 + 0.01),
      bezel: new ShapeGeometry(bezel, 10).translate(0, 0, DEPTH / 2 - RECESS + 0.004),
      screen: new PlaneGeometry(GLASS_W, GLASS_H).translate(0, 0, DEPTH / 2 - RECESS),
      glass: new PlaneGeometry(GLASS_W + 0.01, GLASS_H + 0.01).translate(0, 0, DEPTH / 2 - RECESS + 0.012),
    };
  }, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  /* textures: the LED screen, the floor shadow, the antenna halo */
  useEffect(() => {
    const s = live.current;
    const cols = Math.round(GLASS_W / PITCH), rows = Math.round(GLASS_H / PITCH);
    const screen = makeScreen(cols, rows);
    s.screen = screen;
    const sm = screenMatRef.current;
    if (screen && sm) {
      sm.map = screen.tex;
      sm.needsUpdate = true;
    }
    const radial = (inner: string, mid: string, outer: string) => {
      const size = 128;
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      if (ctx) {
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, inner);
        g.addColorStop(0.55, mid);
        g.addColorStop(1, outer);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      }
      const t = new CanvasTexture(c);
      t.colorSpace = SRGBColorSpace;
      return t;
    };
    const shadow = radial("rgba(0,0,0,0.55)", "rgba(0,0,0,0.25)", "rgba(0,0,0,0)");
    const halo = radial("rgba(255,255,255,0.5)", "rgba(255,255,255,0.14)", "rgba(255,255,255,0)");
    const shm = shadowMatRef.current;
    if (shm) {
      shm.map = shadow;
      shm.needsUpdate = true;
    }
    const hm = haloMatRef.current;
    if (hm) {
      hm.map = halo;
      hm.needsUpdate = true;
    }
    return () => {
      screen?.tex.dispose();
      shadow.dispose();
      halo.dispose();
      s.screen = null;
    };
  }, []);

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

  useEffect(() => {
    const s = live.current;
    const onMove = (e: PointerEvent) => {
      s.tx = e.clientX;
      s.ty = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const onTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    live.current.sim.poke();
  };
  const onOver = () => {
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    document.body.style.cursor = "";
  };

  useFrame((state, dt) => {
    const root = rootRef.current, rig = rigRef.current, head = headRef.current, pose = poseRef.current, antenna = antennaRef.current;
    if (!root || !rig || !head || !pose || !antenna) return;
    const s = live.current;
    const section = sectionRef.current;
    if (!section || !section.isConnected) {
      if (section && !section.isConnected) sectionRef.current = null;
      root.visible = false;
      companionState.active = false;
      return;
    }
    const vh = window.innerHeight || 1;
    const vw = window.innerWidth || 1;
    const rect = section.getBoundingClientRect();
    const near = rect.bottom > -vh && rect.top < vh * 2;
    root.visible = near;
    companionState.active = near;
    if (!near) return;

    const wpp = worldPerPixel(vh);
    const viewH = visibleHeightAtZ(0);
    const aspect = state.size.width / Math.max(1, state.size.height);
    const viewW = viewH * aspect;
    const portrait = aspect < 0.9;

    /* size + placement: head width 26 % of the viewport (cap 420 px), lower-right third; portrait 55 %, upper half */
    const scale = portrait ? 0.55 * viewW : Math.min(0.26 * viewW, 420 * wpp);
    const stageTop = stickyStageTop(rect.top, rect.bottom, vh);
    const stageOffset = (vh / 2 - (stageTop + vh / 2)) * wpp;
    const restX = portrait ? 0 : 0.3 * viewW;
    const restY = portrait ? 0.18 * viewH : -0.1 * viewH; // head centre at rest
    root.position.set(0, stageOffset, 0);
    root.scale.setScalar(scale);

    /* scroll script → state */
    const p = reduced ? 0.5 : heldProgress(section);
    companionState.progress = p;
    const phase: 0 | 1 | 2 = p < 0.33 ? 0 : p < 0.66 ? 1 : 2;
    companionState.phase = phase;
    const glideIn = reduced ? 1 : smooth(0.0, 0.28, p);
    const glideOut = reduced ? 0 : smooth(0.7, 0.9, p);
    const offRight = viewW / 2 + scale * 0.8;
    const offLeft = -viewW / 2 - scale * 0.8;
    const gx = restX + (offRight - restX) * (1 - glideIn) + (offLeft - restX) * glideOut;
    const gy = restY - glideOut * 0.12 * viewH;
    rig.position.set(gx / scale, gy / scale, 0);

    const wanted: RobotState = reduced ? "idle" : phase === 0 ? "idle" : phase === 1 ? "thinking" : "happy";
    if (wanted !== s.scrollState) {
      s.scrollState = wanted;
      s.sim.setState(wanted);
    }
    /* a scroll-speed spike: it searches for a beat (own estimate: scrollState.velocity
       only updates on scroll events, so it would hold its last value after a jump) */
    const dy = scrollState.y - s.lastY;
    s.lastY = scrollState.y;
    const inst = Math.min(6000, Math.abs(dy) / Math.max(1 / 240, dt));
    s.speed += (inst - s.speed) * (1 - Math.exp(-dt * 6));
    const fast = s.speed > 2400 && Math.abs(dy) > 0;
    const now = state.clock.elapsedTime;
    if (fast && !reduced && now > s.searchUntil) {
      s.searchUntil = now + 0.9;
      s.sim.react(0.9);
    }

    /* pointer relative to the head centre, in robot-heads' px scale (160 px per head width) */
    s.headPx.set(gx, gy + stageOffset, 0).project(state.camera);
    const hx = ((s.headPx.x + 1) / 2) * vw;
    const hy = ((1 - s.headPx.y) / 2) * vh;
    const headWidthPx = scale / wpp;
    s.sim.pointer = { x: ((s.tx - hx) / headWidthPx) * 160, y: ((s.ty - hy) / headWidthPx) * 160 };

    /* simulate */
    const sim = s.sim;
    if (!reduced) {
      sim.update(Math.min(dt, 0.1), now < s.searchUntil ? "searching" : "happy");
    } else {
      /* reduced: the still idle pose, the gaze only */
      const k = 1 - Math.exp(-dt * 4);
      const pp = sim.pointer ?? { x: 0, y: 0 };
      s.gazeYaw += (clamp(pp.x / 260, -1, 1) * 0.55 - s.gazeYaw) * k;
      s.gazePitch += (-clamp(pp.y / 260, -1, 1) * 0.32 - s.gazePitch) * k;
      sim.pose = { yaw: s.gazeYaw, pitch: s.gazePitch, roll: 0, x: 0, lift: 0, sx: 1, sy: 1, antennaX: 0, antennaZ: 0 };
      sim.face.lookX = clamp(pp.x / 120, -2.4, 2.4);
      sim.face.lookY = clamp(pp.y / 160, -1.4, 1.4);
      sim.face.blink = 0;
      sim.face.time = 0.4;
      sim.age = 10;
      sim.switched = 10;
    }
    const ps = sim.pose;
    companionState.happy = sim.jumping || sim.shown === "happy";

    /* pose: squash about the bottom of the head, lift in head widths, yaw/pitch/roll (robot-heads axes → three) */
    head.position.set(ps.x, ps.lift - HY, 0);
    head.scale.set(ps.sx, ps.sy, ps.sx);
    pose.position.set(0, HY, 0);
    pose.rotation.set(-ps.pitch, ps.yaw, -ps.roll, "ZYX");

    /* antenna: the stem leans with its springs; the ball's light follows the state */
    antenna.rotation.set(ps.antennaZ, 0, -ps.antennaX);
    const light = LIGHTS[sim.shown];
    let colour = light.ball;
    let level = light.pulse(sim.face.time);
    if (sim.switched < 0.3) {
      const was = LIGHTS[sim.previous];
      const k = sim.switched / 0.3;
      colour = mix(was.ball, colour, k);
      level = was.pulse(sim.face.time + 10) * (1 - k) + level * k;
    }
    if (sim.age < 0.55) level *= smooth(0.1, 0.5, sim.age);
    const bm = ballMatRef.current;
    if (bm) {
      /* a frosted bulb lit from inside: the shell keeps a little of the colour, the light is emissive */
      s.ballColor.setRGB(colour[0] / 255, colour[1] / 255, colour[2] / 255, SRGBColorSpace);
      bm.color.copy(s.ballColor).multiplyScalar(0.35);
      bm.emissive.copy(s.ballColor).multiplyScalar(0.15 + level * 1.25);
    }
    const halo = haloRef.current, hm = haloMatRef.current;
    if (halo && hm) {
      hm.color.copy(s.ballColor);
      hm.opacity = 0.75 * level;
      halo.scale.setScalar(BALL * 7);
    }

    /* the screen: recompose every frame (cheap), redraw at most 30 fps and only when it changed */
    const sc = s.screen;
    if (sc) {
      compose(sim, sc.grid, sc.prev);
      const t = state.clock.elapsedTime;
      if (t - sc.lastDraw > 1 / 30) {
        let changed = false;
        const g = sc.grid.v;
        for (let i = 0; i < g.length; i++) {
          if (Math.abs(g[i] - sc.last[i]) > 0.02) {
            changed = true;
            break;
          }
        }
        if (changed) {
          sc.last.set(g);
          sc.lastDraw = t;
          drawScreen(sc, LED);
        }
      }
    }

    /* the floor shadow, smaller and fainter the higher the head is */
    const shadow = shadowRef.current, shm = shadowMatRef.current;
    if (shadow && shm) {
      const up = Math.max(0, ps.lift);
      shadow.position.set(rig.position.x + ps.x, rig.position.y - HY - 0.11, 0.1);
      shadow.scale.set(2 * HX * (1 - up * 0.9) * ps.sx, 0.26 * (1 - up * 0.9), 1);
      shm.opacity = Math.max(0, 1 - up * 1.6) * (1 - glideOut);
    }

    /* the stage light under it */
    companionState.spotX = gx / viewH;
    companionState.spotY = (gy - HY * scale - 0.11 * scale) / viewH;
  });

  return (
    <group ref={rootRef}>
      <group ref={rigRef}>
        <sprite ref={shadowRef} renderOrder={-1}>
          <spriteMaterial ref={shadowMatRef} transparent depthWrite={false} opacity={0.6} toneMapped={false} />
        </sprite>
        <group ref={headRef} onPointerDown={onTap} onPointerOver={onOver} onPointerOut={onOut}>
          <group ref={poseRef}>
            <pointLight position={[-0.5, 0.9, -0.9]} color="#e040fb" intensity={1.8} distance={3} decay={2} />
            <mesh geometry={geo.shell}>
              <meshPhysicalMaterial vertexColors roughness={0.25} metalness={0} clearcoat={1} clearcoatRoughness={0.12} envMapIntensity={1.4} />
            </mesh>
            <mesh geometry={geo.bezel}>
              <meshStandardMaterial color={BEZEL} roughness={0.6} metalness={0.1} />
            </mesh>
            <mesh geometry={geo.screen}>
              <meshBasicMaterial ref={screenMatRef} toneMapped={false} />
            </mesh>
            <mesh ref={glassRef} geometry={geo.glass}>
              <meshPhysicalMaterial color="#000000" roughness={0.06} metalness={0} clearcoat={1} clearcoatRoughness={0.04} transparent blending={AdditiveBlending} depthWrite={false} envMapIntensity={0.7} />
            </mesh>
            <mesh geometry={geo.ears}>
              <meshStandardMaterial color={TRIM} roughness={0.35} metalness={0.55} />
            </mesh>
            <mesh geometry={geo.screws}>
              <meshStandardMaterial color={TRIM} roughness={0.35} metalness={0.55} />
            </mesh>
            <mesh geometry={geo.back}>
              <meshStandardMaterial color={TRIM} roughness={0.5} metalness={0.4} />
            </mesh>
            <mesh geometry={geo.collar}>
              <meshStandardMaterial color={TRIM} roughness={0.35} metalness={0.55} />
            </mesh>
            <group ref={antennaRef} position={[0, HY + 0.028, 0]}>
              <mesh geometry={geo.stem}>
                <meshStandardMaterial color="#b8b0d8" roughness={0.3} metalness={0.7} />
              </mesh>
              <mesh geometry={geo.ball} position={[0, STEM + BALL * 0.8, 0]}>
                <meshStandardMaterial ref={ballMatRef} color="#c084fc" emissive="#c084fc" roughness={0.35} metalness={0} toneMapped={false} />
              </mesh>
              {tier < 2 ? (
                <sprite ref={haloRef} position={[0, STEM + BALL * 0.8, 0]}>
                  <spriteMaterial ref={haloMatRef} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} opacity={0.6} />
                </sprite>
              ) : null}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
