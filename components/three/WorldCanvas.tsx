"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  BackSide,
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import type { RootState } from "@react-three/fiber";

declare global {
  interface Window {
    /** Dev-only handle for inspecting renderer.info from automation. */
    __world?: RootState;
  }
}
import { useDeviceTier } from "@/lib/hooks";
import { scrollState, writeScroll } from "@/lib/scroll";
import { Backdrop } from "./Backdrop";
import { Lanyard } from "./Lanyard";
import { NeonRing } from "./NeonRing";
import { Companion } from "./Companion";
import { PortraitParticles } from "./PortraitParticles";
import { TechGlyphs } from "./TechGlyphs";
import { CAMERA_FOV, CAMERA_Z } from "./worldScale";

/* ── document visibility as an external store ─────────────── */
function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}
const readHidden = () => document.hidden;
const serverHidden = () => false;

/**
 * If no scroll provider has written `scrollState` yet (vh is still the
 * sentinel 1), mirror window.scrollY so the world is never frozen. Lenis
 * scrolls the window natively, so scrollY is right either way.
 */
function ScrollMirror() {
  useFrame(() => {
    if (scrollState.vh === 1) writeScroll(window.scrollY);
  });
  return null;
}

/**
 * A tiny procedural environment: a dark room with one neon violet light, a
 * cool white strip and an electric-blue wall, pre-filtered once. It gives the
 * badge's clearcoat something to reflect without an HDRI or a network asset.
 */
function buildEnvironment(gl: WebGLRenderer): Texture {
  const scene = new Scene();
  const room = new Mesh(
    new BoxGeometry(20, 20, 20),
    new MeshBasicMaterial({ color: new Color("#0b0916"), side: BackSide }),
  );
  scene.add(room);
  const sun = new Mesh(
    new PlaneGeometry(6, 3.5),
    new MeshBasicMaterial({ color: new Color("#a855f7").multiplyScalar(5) }),
  );
  sun.position.set(-5, 4, 6);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  const warmStrip = new Mesh(
    new PlaneGeometry(10, 0.7),
    new MeshBasicMaterial({ color: new Color("#efeafc").multiplyScalar(3) }),
  );
  warmStrip.position.set(0, 7, -2);
  warmStrip.lookAt(0, 0, 0);
  scene.add(warmStrip);
  const teal = new Mesh(
    new PlaneGeometry(10, 6),
    new MeshBasicMaterial({ color: new Color("#5b8cff").multiplyScalar(1.4) }),
  );
  teal.position.set(7, -3, -4);
  teal.lookAt(0, 0, 0);
  scene.add(teal);

  const pmrem = new PMREMGenerator(gl);
  const rt = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      (o.material as MeshBasicMaterial).dispose();
    }
  });
  return rt.texture;
}

function Environment() {
  const gl = useThree((s) => s.gl);
  const texture = useMemo(() => buildEnvironment(gl), [gl]);
  return <primitive object={texture} attach="environment" dispose={null} />;
}

function Lights() {
  return (
    <>
      <hemisphereLight args={["#a855f7", "#241a4d", 0.4]} />
      <directionalLight position={[-4, 6, 6]} intensity={1.35} color="#e6e0ff" />
    </>
  );
}

function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.25} intensity={0.5} mipmapBlur />
      <Noise opacity={0.04} />
      <Vignette eskil={false} offset={0.28} darkness={0.55} />
    </EffectComposer>
  );
}

export function WorldCanvas() {
  const tier = useDeviceTier();
  const hidden = useSyncExternalStore(subscribeVisibility, readHidden, serverHidden);
  // Events come from the document body so the card can be grabbed through the
  // HTML layers. This module only ever runs on the client (dynamic, ssr: false).
  const [eventSource] = useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : document.body,
  );

  if (!eventSource) return null;

  return (
    <Canvas
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_Z], near: 0.5, far: 60 }}
      scene={{ environmentIntensity: 0.28 }}
      dpr={[1, 1.5]}
      flat
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        powerPreference: "high-performance",
      }}
      frameloop={hidden ? "never" : "always"}
      eventSource={eventSource}
      eventPrefix="client"
      onCreated={(state) => {
        state.gl.setClearColor("#07060d", 1);
        if (process.env.NODE_ENV !== "production") window.__world = state;
      }}
    >
      <ScrollMirror />
      <Environment />
      <Lights />
      <Backdrop />
      <NeonRing />
      <TechGlyphs />
      <Lanyard />
      <Companion />
      <PortraitParticles />
      {tier === 2 ? <Effects /> : null}
    </Canvas>
  );
}
