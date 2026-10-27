"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Dims } from "@/lib/data";
import { sideDoor, stagingBoxes, trainingFloor, windowSpan, zones, type Rect } from "@/lib/geometry";
import { useStore } from "@/lib/store";
import type { Palette } from "@/lib/theme";
import { canvasTexture, rng, shade } from "./primitives";

const WALL_H = 2.4;
const T = 0.1;
type Side = "front" | "back" | "left" | "right";
export type LayerRef = React.RefObject<HTMLElement>;
type RegFn = (m: THREE.Material | null) => void | (() => void);

function useTextures(pal: Palette, dims: Dims) {
  const tex = useMemo(() => {
    const r1 = rng("brick"), r2 = rng("concrete");
    const brick = canvasTexture(256, 128, (x) => {
      x.fillStyle = "#b5a898";
      x.fillRect(0, 0, 256, 128);
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? -32 : 0;
        for (let i = -1; i < 5; i++) {
          x.fillStyle = shade(pal.wall, (r1() - 0.5) * 0.1, (r1() - 0.5) * 0.08);
          x.fillRect(off + i * 64 + 2, row * 32 + 2, 60, 28);
        }
      }
    });
    const concrete = canvasTexture(256, 256, (x) => {
      x.fillStyle = pal.floor;
      x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2400; i++) {
        x.fillStyle = shade(pal.floor, (r2() - 0.5) * 0.1);
        x.fillRect(r2() * 256, r2() * 256, 1 + r2() * 2, 1 + r2() * 2);
      }
    });
    concrete.repeat.set(dims.W / 1.5, dims.D / 1.5);
    const roller = canvasTexture(64, 32, (x) => {
      x.fillStyle = pal.roller;
      x.fillRect(0, 0, 64, 32);
      x.fillStyle = shade(pal.roller, -0.07);
      x.fillRect(0, 25, 64, 7);
      x.fillStyle = shade(pal.roller, 0.08);
      x.fillRect(0, 0, 64, 3);
    });
    roller.repeat.set(1, 2.15 / 0.09);
    const hatch = canvasTexture(64, 64, (x) => {
      x.strokeStyle = pal.accent;
      x.lineWidth = 6;
      x.globalAlpha = 0.6;
      for (let i = -64; i < 128; i += 22) {
        x.beginPath();
        x.moveTo(i, 64);
        x.lineTo(i + 64, 0);
        x.stroke();
      }
    });
    return { brick, concrete, roller, hatch };
  }, [pal, dims]);
  useEffect(() => () => Object.values(tex).forEach((t) => t.dispose()), [tex]);
  return tex;
}

/** A brick wall block, registered for the see-through cutaway. */
function Wall({ side, from, to, brick, reg }: { side: Side; from: THREE.Vector3Tuple; to: THREE.Vector3Tuple; brick: THREE.Texture; reg: (s: Side) => RegFn }) {
  const size: THREE.Vector3Tuple = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const map = useMemo(() => {
    const t = brick.clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(size[0], size[2]) / 0.86, size[1] / 0.3);
    return t;
  }, [brick, size[0], size[1], size[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial ref={reg(side)} map={map} roughness={0.92} transparent />
    </mesh>
  );
}

function FloorRect({ r, color, opacity, y, map }: { r: Rect; color: string; opacity: number; y: number; map?: THREE.Texture }) {
  const tex = useMemo(() => {
    if (!map) return undefined;
    const t = map.clone();
    t.needsUpdate = true;
    t.repeat.set((r.x1 - r.x0) / 0.45, (r.y1 - r.y0) / 0.45);
    return t;
  }, [map, r.x0, r.x1, r.y0, r.y1]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(r.x0 + r.x1) / 2, y, -(r.y0 + r.y1) / 2]}>
      <planeGeometry args={[r.x1 - r.x0, r.y1 - r.y0]} />
      <meshBasicMaterial color={map ? "#ffffff" : color} map={tex} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

const outline = (r: Rect, y: number): THREE.Vector3Tuple[] => [
  [r.x0, y, -r.y0], [r.x1, y, -r.y0], [r.x1, y, -r.y1], [r.x0, y, -r.y1], [r.x0, y, -r.y0],
];

function Label({ at, children, title, layer }: { at: THREE.Vector3Tuple; children: string; title?: boolean; layer: LayerRef }) {
  return (
    <Html position={at} center portal={layer} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div className={title ? "tag3 title" : "tag3"}>{children}</div>
    </Html>
  );
}

export function Room({ pal, layer }: { pal: Palette; layer: LayerRef }) {
  const dims = useStore((s) => s.dims);
  const showZones = useStore((s) => s.zones);
  const kit = useStore((s) => s.mode === "plan" && s.kit);
  const narrow = useStore((s) => s.narrow);
  const { W, D } = dims;
  const tex = useTextures(pal, dims);

  // Materials per wall side, faded when the camera is outside that wall
  const mats = useRef<Record<Side, Set<THREE.Material>>>({ front: new Set(), back: new Set(), left: new Set(), right: new Set() });
  const base = useRef(new WeakMap<THREE.Material, number>());
  const reg = useMemo(() => {
    const cache = {} as Record<Side, RegFn>;
    (["front", "back", "left", "right"] as Side[]).forEach((side) => {
      cache[side] = (m) => {
        if (!m) return;
        mats.current[side].add(m);
        if (!base.current.has(m)) base.current.set(m, m.opacity);
        return () => {
          mats.current[side].delete(m);
        };
      };
    });
    return (s: Side) => cache[s];
  }, []);
  // Joists share one material so a single opacity change fades them all
  const joistMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#9c7650", transparent: true, roughness: 0.9 }), []);
  useEffect(() => () => joistMat.dispose(), [joistMat]);

  useFrame(({ camera }) => {
    const p = camera.position;
    const cut: Record<Side, boolean> = { front: p.z > 0.05, back: p.z < -D - 0.05, left: p.x < -0.05, right: p.x > W + 0.05 };
    (Object.keys(cut) as Side[]).forEach((side) => {
      for (const m of mats.current[side]) {
        const o = cut[side] ? 0.07 : base.current.get(m) ?? 1;
        if (m.opacity !== o) {
          m.opacity = o;
          m.depthWrite = !cut[side];
        }
      }
    });
    joistMat.opacity = p.y > 2.3 ? 0.2 : 1;
  });

  const win = windowSpan(dims);
  const dx0 = W - 0.8, dx1 = W - 0.05, bz0 = -D - T, bz1 = -D, bz = -D - T / 2;
  const tz = trainingFloor(dims);
  const door = sideDoor(dims);
  const arc = useMemo(() => {
    const pts: THREE.Vector3Tuple[] = [];
    for (let a = 180; a <= 270; a += 6) {
      const r = (a * Math.PI) / 180;
      pts.push([door.hx + door.r * Math.cos(r), 0.006, -(door.hy + door.r * Math.sin(r))]);
    }
    return pts;
  }, [door.hx, door.hy, door.r]);
  const boxes = stagingBoxes(dims, narrow);
  const joists = useMemo(() => {
    const zs: number[] = [];
    for (let z = -0.45; z > -D; z -= 0.6) zs.push(z);
    return zs;
  }, [D]);

  return (
    <group>
      {/* ground + floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, -0.012, -D / 2]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={pal.stage} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, 0, -D / 2]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={tex.concrete} roughness={0.95} />
      </mesh>

      {/* walls */}
      <Wall side="left" from={[-T, 0, -D - T]} to={[0, WALL_H, T]} brick={tex.brick} reg={reg} />
      <Wall side="right" from={[W, 0, -D - T]} to={[W + T, WALL_H, T]} brick={tex.brick} reg={reg} />
      <Wall side="back" from={[0, 0, bz0]} to={[win.x0, WALL_H, bz1]} brick={tex.brick} reg={reg} />
      <Wall side="back" from={[win.x0, 0, bz0]} to={[win.x1, 1.0, bz1]} brick={tex.brick} reg={reg} />
      <Wall side="back" from={[win.x0, 2.0, bz0]} to={[win.x1, WALL_H, bz1]} brick={tex.brick} reg={reg} />
      <Wall side="back" from={[win.x1, 0, bz0]} to={[dx0, WALL_H, bz1]} brick={tex.brick} reg={reg} />
      <Wall side="back" from={[dx0, 2.05, bz0]} to={[dx1, WALL_H, bz1]} brick={tex.brick} reg={reg} />
      <Wall side="back" from={[dx1, 0, bz0]} to={[W, WALL_H, bz1]} brick={tex.brick} reg={reg} />
      <Wall side="front" from={[-T, 2.15, 0]} to={[W + T, WALL_H, T]} brick={tex.brick} reg={reg} />

      {/* window */}
      <mesh position={[(win.x0 + win.x1) / 2, 1.5, bz]}>
        <boxGeometry args={[win.x1 - win.x0, 1.0, 0.02]} />
        <meshStandardMaterial ref={reg("back")} color={pal.glass} transparent opacity={0.35} roughness={0.1} />
      </mesh>
      {[win.x0 + 0.025, (win.x0 + win.x1) / 2, win.x1 - 0.025].map((x) => (
        <mesh key={x} position={[x, 1.5, bz]}>
          <boxGeometry args={[0.05, 1.0, 0.06]} />
          <meshStandardMaterial ref={reg("back")} color="#f2f2ef" transparent />
        </mesh>
      ))}
      <mesh position={[(win.x0 + win.x1) / 2, 1.72, bz]}>
        <boxGeometry args={[win.x1 - win.x0, 0.05, 0.06]} />
        <meshStandardMaterial ref={reg("back")} color="#f2f2ef" transparent />
      </mesh>

      {/* side door */}
      <mesh position={[(dx0 + dx1) / 2, 1.025, bz]}>
        <boxGeometry args={[dx1 - dx0, 2.05, 0.05]} />
        <meshStandardMaterial ref={reg("back")} color={pal.doorc} transparent roughness={0.5} />
      </mesh>
      <mesh position={[(dx0 + dx1) / 2, 1.45, bz]}>
        <boxGeometry args={[0.4, 0.85, 0.06]} />
        <meshStandardMaterial ref={reg("back")} color="#2b3a44" transparent roughness={0.2} />
      </mesh>

      {/* roller door */}
      <mesh position={[W / 2, 1.075, 0.03]}>
        <boxGeometry args={[W, 2.15, 0.06]} />
        <meshStandardMaterial ref={reg("front")} map={tex.roller} transparent roughness={0.6} metalness={0.2} />
      </mesh>

      {/* exposed joists */}
      {joists.map((z) => (
        <mesh key={z} position={[W / 2, WALL_H - 0.07, z]} material={joistMat}>
          <boxGeometry args={[W, 0.14, 0.05]} />
        </mesh>
      ))}

      {/* zones */}
      {showZones && (
        <>
          {zones(dims, kit).map((z) => (
            <group key={z.id}>
              <FloorRect r={z} color={pal[`${z.cat}-f` as const]} opacity={0.4} y={0.003} />
              <Line points={outline(z, 0.004)} color={pal[`${z.cat}-l` as const]} lineWidth={1.2} dashed dashSize={0.1} gapSize={0.07} />
            </group>
          ))}
          <FloorRect r={tz} color="#ffffff" opacity={0.85} y={0.018} map={tex.hatch} />
          <Line points={outline(tz, 0.019)} color={pal.accent} lineWidth={1.6} />
        </>
      )}
      <Line points={arc} color={pal.muted} lineWidth={1.2} dashed dashSize={0.08} gapSize={0.06} />

      {/* drop zones */}
      {(["shelve", "remove"] as const).map((k) => {
        const b = boxes[k];
        return (
          <group key={k}>
            <FloorRect r={b} color={pal.panel} opacity={1} y={0.001} />
            <Line points={outline(b, 0.003)} color={k === "remove" ? pal.danger : pal.boxline} lineWidth={1.4} dashed dashSize={0.12} gapSize={0.08} />
            <Label layer={layer} at={[(b.x0 + b.x1) / 2, 0.02, -b.y1 + 0.12]} title>{k === "remove" ? "Out: sell, donate, garden" : "Put away on shelves"}</Label>
          </group>
        );
      })}

      <Label layer={layer} at={[W / 2, 0.02, 0.45]}>ROLLER DOOR</Label>
      <Label layer={layer} at={[(dx0 + dx1) / 2, 2.55, -D]}>SIDE DOOR</Label>
      <Label layer={layer} at={[(win.x0 + win.x1) / 2, 2.55, -D]}>WINDOW</Label>
    </group>
  );
}
