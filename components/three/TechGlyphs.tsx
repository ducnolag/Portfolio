"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, type Group, Sprite, SpriteMaterial, SRGBColorSpace } from "three";
import { skills } from "@/lib/content";
import { useDeviceTier, useReducedMotion } from "@/lib/hooks";
import { scrollState } from "@/lib/scroll";
import { lanyardState } from "./lanyardState";
import { worldPerPixel } from "./worldScale";

/* ─────────────────────────────────────────────────────────────
   Floating stack tags around the neon ring: dark rounded pills with the
   word in the display face, drawn to CanvasTextures (no logos, no emoji).
   Two lazy elliptical orbits, sine bob, pointer parallax; they lift and
   scatter as the hero scrolls away, and never cross into the headline column.
   ───────────────────────────────────────────────────────────── */

const CARD_W = 1.6;
const CARD_H = 2.25;
const MAX_WORD_CHARS = 12;
const COUNT = 8; // desktop; portrait shows one of the two orbits (4)
const COUNT_LOW = 4;
const PILL_PX = 28; // pill height on landscape, in CSS px
const PILL_PX_PORTRAIT = 22;
const PILL_H = 0.2; // nominal world units (rescaled per frame to the px sizes)
const LEFT_LIMIT = 0.56; // of viewport width: never enter the copy column
/** Shared hero tempo: glyph orbit 1 rev / 48 s. */
const ORBIT_OMEGA = (Math.PI * 2) / 48;

/** Up to three short words per skill group, then fill from the rest, in order. */
function pickWords(max: number): string[] {
  const out: string[] = [];
  const rest: string[] = [];
  for (const g of skills) {
    let n = 0;
    for (const item of g.items) {
      if (item.length > MAX_WORD_CHARS) continue;
      if (n < 3) {
        out.push(item);
        n++;
      } else rest.push(item);
    }
  }
  for (const w of rest) {
    if (out.length >= max) break;
    out.push(w);
  }
  return out.slice(0, max);
}

function readDisplayFamily(): string {
  const fam = getComputedStyle(document.body).fontFamily;
  return fam && fam.length > 0 ? fam : "system-ui, sans-serif";
}

/** Draw a pill with the word; returns the texture and its aspect ratio. */
function drawPill(word: string, family: string): { tex: CanvasTexture; aspect: number } {
  const scale = 3;
  const h = 40 * scale;
  const pad = 18 * scale;
  const measure = document.createElement("canvas").getContext("2d");
  let textW = 80 * scale;
  if (measure) {
    measure.font = `600 ${17 * scale}px ${family}`;
    textW = measure.measureText(word).width;
  }
  const w = Math.ceil(textW + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(r, 1);
    ctx.arcTo(w - 1, 1, w - 1, h - 1, r);
    ctx.arcTo(w - 1, h - 1, 1, h - 1, r);
    ctx.arcTo(1, h - 1, 1, 1, r);
    ctx.arcTo(1, 1, w - 1, 1, r);
    ctx.closePath();
    ctx.fillStyle = "rgba(21,17,39,0.85)"; // ink-3 @ 85 %
    ctx.fill();
    ctx.lineWidth = 1 * scale;
    ctx.strokeStyle = "rgba(192,132,252,0.4)"; // orchid @ 40 %
    ctx.stroke();
    ctx.fillStyle = "#efeafc";
    ctx.font = `600 ${17 * scale}px ${family}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    try {
      ctx.letterSpacing = `${0.2 * scale}px`;
    } catch {
      /* older canvas implementations */
    }
    ctx.fillText(word, w / 2, h / 2 + 1);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: w / h };
}

type Glyph = {
  sprite: Sprite;
  material: SpriteMaterial;
  tex: CanvasTexture;
  ring: 0 | 1;
  angle: number;
  speed: number;
  bob: number;
  scatterX: number;
  scatterY: number;
  halfW: number;
  aspect: number;
  depthK: number;
  /** vertical nudge that keeps pills from stacking on each other */
  offY: number;
  /** smoothed push along the orbit normal that keeps the pill out of the card's rect */
  offN: number;
  px: number;
  py: number;
};

type Live = { px: number; py: number; tx: number; ty: number };

export function TechGlyphs() {
  const tier = useDeviceTier();
  const reduced = useReducedMotion();
  const groupRef = useRef<Group>(null);
  const glyphs = useRef<Glyph[]>([]);
  const live = useRef<Live>({ px: 0, py: 0, tx: 0, ty: 0 });
  const words = useMemo(() => pickWords(tier === 0 ? COUNT_LOW : COUNT), [tier]);

  useEffect(() => {
    const s = live.current;
    const onMove = (e: PointerEvent) => {
      s.tx = (e.clientX / window.innerWidth) * 2 - 1;
      s.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  /* Build the sprites imperatively into the group; rebuild when the fonts land. */
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    let cancelled = false;
    let rnd = 97;
    const rand = () => {
      rnd = (rnd * 1664525 + 1013904223) >>> 0;
      return rnd / 4294967296;
    };

    const dispose = () => {
      for (const g of glyphs.current) {
        group.remove(g.sprite);
        g.material.dispose();
        g.tex.dispose();
      }
      glyphs.current = [];
    };

    const build = () => {
      if (cancelled) return;
      dispose();
      const family = readDisplayFamily();
      const n = words.length;
      glyphs.current = words.map((word, i) => {
        const ring: 0 | 1 = i % 2 === 0 ? 0 : 1;
        const { tex, aspect } = drawPill(word, family);
        const material = new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
        const sprite = new Sprite(material);
        const size = PILL_H;
        sprite.scale.set(size * aspect, size, 1);
        sprite.renderOrder = -1;
        group.add(sprite);
        const perRing = Math.ceil(n / 2);
        const idx = Math.floor(i / 2);
        const sa = (idx / perRing) * Math.PI * 2 + (ring ? 0.9 : 0) + rand() * 0.25;
        const dir = rand() * Math.PI * 2;
        return {
          sprite,
          material,
          tex,
          ring,
          angle: sa,
          speed: ORBIT_OMEGA * (ring ? 0.9 : 1.0),
          bob: rand() * Math.PI * 2,
          scatterX: Math.cos(dir) * (1.5 + rand() * 1.5),
          scatterY: 1.2 + rand() * 1.4,
          halfW: (size * aspect) / 2,
          aspect,
          depthK: 0.7 + rand() * 0.6,
          offY: 0,
          offN: 0,
          px: 0,
          py: 0,
        };
      });
    };

    build();
    if ("fonts" in document) {
      document.fonts.ready.then(build).catch(() => undefined);
    }
    return () => {
      cancelled = true;
      dispose();
    };
  }, [words]);

  useFrame((state, dt) => {
    const group = groupRef.current;
    if (!group) return;
    const L = lanyardState;
    const vh = window.innerHeight || 1;
    const f = Math.min(1, scrollState.y / vh);
    const show = L.ready && f < 1;
    group.visible = show;
    if (!show) return;

    const wpp = worldPerPixel(vh);
    group.position.y = scrollState.y * wpp;
    const s = live.current;
    const k = 1 - Math.exp(-dt * 4);
    s.px += (s.tx - s.px) * k;
    s.py += (s.ty - s.py) * k;

    const t = state.clock.elapsedTime;
    const portrait = L.viewW < L.viewH;
    const radius = Math.min(0.9 * L.cardHeight, (portrait ? 0.4 : 0.2) * L.viewW);
    const cx = L.restX;
    // landscape: orbit the ring under the card; portrait: orbit the card's upper half only
    const cy = portrait ? L.restY + L.cardHeight * 0.22 : L.restY - L.cardHeight / 2 - 0.1;
    const leftLimit = portrait ? -L.viewW / 2 + 0.08 : -L.viewW / 2 + LEFT_LIMIT * L.viewW;
    const rightLimit = L.viewW / 2 - 0.08;
    const floor = portrait ? L.restY : -L.viewH / 2 + 0.3;
    const ceiling = portrait ? L.restY + L.cardHeight / 2 + 0.3 : L.viewH / 2 + 0.3;
    const pillH = (portrait ? PILL_PX_PORTRAIT : PILL_PX) * wpp;
    const ease = f * f * (3 - 2 * f);

    const list = glyphs.current;
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      // portrait: half the tags, the screen is narrow
      g.sprite.visible = !(portrait && g.ring === 1);
      g.sprite.scale.set(pillH * g.aspect, pillH, 1);
      g.halfW = (pillH * g.aspect) / 2;
      if (!reduced) g.angle += g.speed * dt;
      const a = g.angle;
      const ox = portrait ? 0 : g.ring ? 0.4 * radius : 0.25 * radius;
      const rx = portrait ? 0.46 * L.viewW : g.ring ? 1.15 * radius : 0.9 * radius;
      const ry = portrait ? L.cardHeight * 0.2 : g.ring ? 0.95 * radius : 0.42 * radius;
      const bob = reduced ? 0 : Math.sin(t * 0.9 + g.bob) * 0.06;
      let x = cx + ox + Math.cos(a) * rx + s.px * 0.12 * g.depthK;
      let y = cy + Math.sin(a) * ry + bob + s.py * 0.08 * g.depthK;
      const z = -0.6 + Math.sin(a) * 0.35;

      // keep the pill out of the badge: test in the z = 0 plane (perspective-
      // corrected), push outward along the orbit normal by the exit distance
      {
        const persp = 10 / (10 - z);
        const nx0 = Math.cos(a) / rx;
        const ny0 = Math.sin(a) / ry;
        const nl = Math.hypot(nx0, ny0) || 1;
        const nx = nx0 / nl;
        const ny = ny0 / nl;
        const margin = 16 * wpp;
        const cr = Math.abs(Math.cos(L.roll));
        const sr = Math.abs(Math.sin(L.roll));
        const cw = (CARD_W * L.scale) / 2;
        const ch = (CARD_H * L.scale) / 2;
        const hw = cw * cr + ch * sr + margin + g.halfW;
        const hh = cw * sr + ch * cr + margin + pillH / 2;
        const qx = x * persp - L.x;
        const qy = y * persp - L.y;
        let want = 0;
        if (Math.abs(qx) < hw && Math.abs(qy) < hh) {
          const tx = nx !== 0 ? ((nx > 0 ? hw : -hw) - qx) / nx : Infinity;
          const ty = ny !== 0 ? ((ny > 0 ? hh : -hh) - qy) / ny : Infinity;
          want = Math.min(tx, ty) / persp + 0.05;
        }
        g.offN += (want - g.offN) * (1 - Math.exp(-dt * 14));
        x += nx * g.offN;
        y += ny * g.offN;
      }
      // lift and scatter while the hero leaves
      x += g.scatterX * ease;
      y += g.scatterY * ease;
      x = Math.min(rightLimit - g.halfW, Math.max(leftLimit + g.halfW, x));
      y = Math.min(ceiling, Math.max(floor, y));
      g.px = x;
      g.py = y;
      g.sprite.position.z = z;
      g.material.opacity = 0.82 * (1 - ease);
    }
    // gentle separation: pills that would stack get nudged apart vertically
    const nudge = 1 - Math.exp(-dt * 4);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.sprite.visible) continue;
      let want = 0;
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue;
        const b = list[j];
        if (!b.sprite.visible) continue;
        const dx = a.px - b.px;
        const dy = a.py - b.py; // base positions, so the nudge is a stable target
        const minX = a.halfW + b.halfW + 0.06;
        const minY = pillH * 1.15;
        if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
          const dir = dy === 0 ? (i < j ? 1 : -1) : Math.sign(dy);
          want += dir * (minY - Math.abs(dy)) * 0.5;
        }
      }
      a.offY += (want - a.offY) * nudge;
      a.sprite.position.set(a.px, a.py + a.offY, a.sprite.position.z);
    }
  });

  return <group ref={groupRef} />;
}
