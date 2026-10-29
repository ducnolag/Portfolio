"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { useIsTouch, useReducedMotion } from "@/lib/hooks";

type Props = {
  children: ReactNode;
  /** Max rotation in degrees. Kept ≤ 5 so text stays legible mid-tilt. */
  max?: number;
  className?: string;
  surfaceClassName?: string;
  style?: CSSProperties;
};

const SPRING = { stiffness: 220, damping: 26, mass: 0.7 };

/**
 * Pointer-driven 3D tilt. Outer element supplies perspective; inner surface
 * rotates through springs. Off for touch and reduced motion.
 */
export function Tilt({ children, max = 5, className = "", surfaceClassName = "", style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const touch = useIsTouch();
  const reduced = useReducedMotion();
  const enabled = !touch && !reduced;

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, SPRING);
  const sry = useSpring(ry, SPRING);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max * 2);
    rx.set(-py * max * 2);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      style={{ perspective: 1400, ...style }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <motion.div
        className={`tilt-surface ${surfaceClassName}`}
        style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
