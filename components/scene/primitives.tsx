"use client";

import { useMemo } from "react";
import * as THREE from "three";

export type V3 = [number, number, number];
type MatOpts = Partial<{
  roughness: number;
  metalness: number;
  transparent: boolean;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  side: THREE.Side;
}>;

function Mat({ c, o }: { c: string; o?: MatOpts }) {
  return <meshStandardMaterial color={c} roughness={0.78} metalness={0.04} {...o} />;
}

/** Box whose `p[1]` is its base height, not its centre. */
export function Bx({ s, p = [0, 0, 0], c, o, shadow = true }: { s: V3; p?: V3; c: string; o?: MatOpts; shadow?: boolean }) {
  return (
    <mesh position={[p[0], p[1] + s[1] / 2, p[2]]} castShadow={shadow} receiveShadow>
      <boxGeometry args={s} />
      <Mat c={c} o={o} />
    </mesh>
  );
}

/** Cylinder centred on `p`, lying along `axis` (default upright). */
export function Cyl({ r, len, c, p = [0, 0, 0], axis, o }: { r: number; len: number; c: string; p?: V3; axis?: "x" | "z"; o?: MatOpts }) {
  const rot: V3 = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, len, 18]} />
      <Mat c={c} o={o} />
    </mesh>
  );
}

const UP = new THREE.Vector3(0, 1, 0);

/** Thin cylinder between two points: frames, tubes, ropes. */
export function Rod({ a, b, r, c }: { a: V3; b: V3; r: number; c: string }) {
  const { pos, quat, len } = useMemo(() => {
    const A = new THREE.Vector3(...a);
    const v = new THREE.Vector3(...b).sub(A);
    const len = v.length();
    const pos = A.clone().addScaledVector(v, 0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, v.normalize());
    return { pos, quat, len };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[r, r, len, 8]} />
      <Mat c={c} />
    </mesh>
  );
}

/** Small deterministic PRNG so shelving contents look the same on every load. */
export function rng(seed: string) {
  let s = [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 2147483647, 7) || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const shade = (hex: string, dl: number, ds = 0) => "#" + new THREE.Color(hex).offsetHSL(0, ds, dl).getHexString();
