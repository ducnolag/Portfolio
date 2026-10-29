"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  CanvasTexture,
  Color,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type Sprite,
  type SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
} from "three";
import { useDeviceTier, useReducedMotion } from "@/lib/hooks";
import { scrollState } from "@/lib/scroll";
import { lanyardState } from "./lanyardState";
import { worldPerPixel } from "./worldScale";

/* ─────────────────────────────────────────────────────────────
   The neon ring: a thin emissive torus, magenta → violet along its
   length, tilted ~70° so it reads as a glowing arc under / behind the
   badge. Slow spin, breathing, pointer yaw, a flare when the card is
   thrown. Tier 2 glows through Bloom; tiers 0–1 get an additive halo
   sprite behind it. Lives with the hero: rises away as the page scrolls.
   ───────────────────────────────────────────────────────────── */

const TILT = (72 * Math.PI) / 180;
/** Shared hero tempo: ring 1 rev / 40 s; breathing on the badge's 6 s sway. */
const SPIN_OMEGA = (Math.PI * 2) / 40;
const BREATH_OMEGA = (Math.PI * 2) / 6;
const SIN_TILT = Math.sin(TILT);
const MAGENTA = new Color("#e040fb");
const VIOLET = new Color("#7c3aed");
const NEON = new Color("#a855f7");
const WHITE = new Color("#efeafc");

/** Unit-radius torus with a colour gradient around the ring (scaled per frame). */
function makeRingGeometry(): TorusGeometry {
  const g = new TorusGeometry(1, 0.0125, 10, 200);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getY(i), pos.getX(i));
    const t = 0.5 + 0.5 * Math.sin(a * 2 + 0.4); // two magenta crests, two violet troughs
    c.copy(VIOLET).lerp(MAGENTA, t);
    // one hot spot where the tube reads as lit glass
    const hot = Math.pow(0.5 + 0.5 * Math.cos(a - 0.9), 10);
    c.lerp(WHITE, hot * 0.6);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(colors, 3));
  return g;
}

function makeHaloTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(224,64,251,0.55)");
    grad.addColorStop(0.25, "rgba(168,85,247,0.42)");
    grad.addColorStop(0.55, "rgba(124,58,237,0.16)");
    grad.addColorStop(1, "rgba(124,58,237,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

type Live = { yaw: number; flare: number; spin: number; px: number; tx: number };

export function NeonRing() {
  const tier = useDeviceTier();
  const reduced = useReducedMotion();
  const rigRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const matRef = useRef<MeshBasicMaterial>(null);
  const haloRef = useRef<Sprite>(null);
  const haloMatRef = useRef<SpriteMaterial>(null);
  const live = useRef<Live>({ yaw: 0, flare: 0, spin: 0, px: 0, tx: 0 });
  const geometry = useMemo(() => makeRingGeometry(), []);
  const withHalo = tier < 2;

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    const s = live.current;
    const onMove = (e: PointerEvent) => {
      s.tx = (e.clientX / window.innerWidth) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    if (!withHalo) return;
    const mat = haloMatRef.current;
    if (!mat) return;
    const tex = makeHaloTexture();
    mat.map = tex;
    mat.needsUpdate = true;
    return () => {
      mat.map = null;
      tex.dispose();
    };
  }, [withHalo]);

  useFrame((state, dt) => {
    const rig = rigRef.current;
    const ring = ringRef.current;
    const mat = matRef.current;
    if (!rig || !ring || !mat) return;
    const L = lanyardState;
    const vh = window.innerHeight || 1;
    const f = Math.min(1, scrollState.y / vh);
    const awake = L.ready && L.awake && f < 1;
    rig.visible = awake;
    if (!awake) return;
    const leave = 1 - f * f * (3 - 2 * f); // same ease as the glyphs

    rig.position.y = scrollState.y * worldPerPixel(vh);

    const s = live.current;
    const t = state.clock.elapsedTime;
    // radius: 0.9 × card height, capped so it never reaches into the headline
    // column (landscape) or past the edges (portrait). The whole torus sits
    // behind the card plane, so the card is never cut by the front arc.
    const portrait = L.viewW < L.viewH;
    const radius = Math.min(0.9 * L.cardHeight, (portrait ? 0.4 : 0.2) * L.viewW);
    const cx = L.restX;
    const cy = portrait ? L.restY - L.cardHeight * 0.3 : L.restY - L.cardHeight / 2 - 0.1;
    const cz = -0.3 - radius * SIN_TILT;

    s.px += (s.tx - s.px) * (1 - Math.exp(-dt * 4));
    s.yaw = s.px * 0.14; // +-8 deg
    if (!reduced) s.spin += dt * SPIN_OMEGA;
    if (L.speed > 5) s.flare = Math.max(s.flare, Math.min(1, (L.speed - 5) / 8));
    s.flare *= Math.exp(-dt * 2.5);

    ring.position.set(cx, cy, cz);
    ring.scale.setScalar(radius);
    ring.rotation.set(TILT, s.yaw, s.spin);

    const breath = reduced ? 0 : Math.sin(t * BREATH_OMEGA) * 0.3 + Math.sin(t * BREATH_OMEGA * 2.4) * 0.08;
    mat.color.setScalar((1.55 + breath + s.flare * 1.6) * leave);

    const halo = haloRef.current;
    const haloMat = haloMatRef.current;
    if (halo && haloMat) {
      halo.position.set(cx, cy + 0.1, cz - 0.3);
      halo.scale.set(radius * 3.0, radius * 1.7, 1);
      haloMat.opacity = (0.55 + breath * 0.3 + s.flare * 0.45) * leave;
    }
  });

  return (
    <group ref={rigRef}>
      {withHalo ? (
        <sprite ref={haloRef} renderOrder={-5}>
          <spriteMaterial
            ref={haloMatRef}
            transparent
            depthWrite={false}
            depthTest={false}
            blending={AdditiveBlending}
            toneMapped={false}
            opacity={0.55}
            color={NEON}
          />
        </sprite>
      ) : null}
      <mesh ref={ringRef} geometry={geometry} frustumCulled={false}>
        <meshBasicMaterial ref={matRef} vertexColors toneMapped={false} />
      </mesh>
    </group>
  );
}
