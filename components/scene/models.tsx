"use client";

import { memo, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { Bx, Cyl, Rod, rng, type V3 } from "./primitives";

/**
 * Low-poly stand-ins for everything in the garage.
 * Each model is built in local space: length `w` along X, depth `h` along Z, sitting on y = 0.
 * Left-wall and back-wall pieces face local +Z; the right-wall tool rail faces local -Z (always into the room).
 */

interface ModelProps {
  id: string;
  w: number;
  h: number;
  upright: boolean;
}

const corners = (w: number, h: number, inset: number): [number, number][] =>
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => [a * (w / 2 - inset), b * (h / 2 - inset)]);

function Shelving({ id, w, h, height, levels, palette }: { id: string; w: number; h: number; height: number; levels: number[]; palette: string[] }) {
  const boxes = useMemo(() => {
    const r = rng(id);
    const out: { s: V3; p: V3; c: string }[] = [];
    levels.forEach((y, i) => {
      const top = (levels[i + 1] ?? height + 0.28) - y - 0.06;
      let x = -w / 2 + 0.03;
      for (;;) {
        const bw = 0.16 + r() * 0.24;
        if (x + bw > w / 2 - 0.02) break;
        if (r() < 0.12) { x += bw; continue; }
        const bh = Math.min(top, 0.1 + r() * 0.3);
        out.push({ s: [bw - 0.025, bh, h - 0.06 - r() * 0.08], p: [x + bw / 2, y + 0.022, 0], c: palette[Math.floor(r() * palette.length)] });
        x += bw;
      }
    });
    return out;
  }, [id, w, h, height, levels, palette]);
  return (
    <>
      {corners(w, h, 0.02).map(([x, z], i) => <Bx key={i} s={[0.035, height, 0.035]} p={[x, 0, z]} c="#1d1e1f" />)}
      {levels.map((y) => <Bx key={y} s={[w, 0.022, h]} p={[0, y, 0]} c="#2b2c2d" />)}
      {boxes.map((b, i) => <Bx key={i} {...b} />)}
    </>
  );
}

function Bike({ w, h, frame }: { w: number; h: number; frame: string }) {
  const wx = w / 2 - 0.36, wr = 0.33;
  const P: Record<string, V3> = { rh: [-wx, wr, 0], bb: [-0.05, 0.3, 0], st: [-0.22, 0.86, 0], ht: [wx - 0.14, 0.92, 0], hb: [wx - 0.1, 0.7, 0], fh: [wx, wr, 0] };
  const tubes: [string, string][] = [["rh", "bb"], ["rh", "st"], ["bb", "st"], ["st", "ht"], ["bb", "hb"], ["hb", "ht"]];
  return (
    <>
      {[-wx, wx].map((x) => (
        <group key={x}>
          <mesh position={[x, wr, 0]} castShadow>
            <torusGeometry args={[wr, 0.032, 8, 32]} />
            <meshStandardMaterial color="#181818" roughness={0.9} />
          </mesh>
          <Cyl r={0.03} len={0.1} c="#9a9a9a" p={[x, wr, 0]} axis="z" />
        </group>
      ))}
      {tubes.map(([a, b]) => <Rod key={a + b} a={P[a]} b={P[b]} r={0.024} c={frame} />)}
      <Rod a={P.hb} b={P.fh} r={0.02} c="#777777" />
      <Rod a={P.ht} b={[wx - 0.17, 1.02, 0]} r={0.02} c="#333333" />
      <Rod a={[wx - 0.17, 1.02, -h / 2 + 0.03]} b={[wx - 0.17, 1.02, h / 2 - 0.03]} r={0.016} c="#222222" />
      <Bx s={[0.24, 0.05, 0.11]} p={[-0.25, 0.88, 0]} c="#151515" />
    </>
  );
}

const SHELF_LEVELS = [0.05, 0.45, 0.85, 1.25, 1.65];
const GARDEN_LEVELS = [0.05, 0.4, 0.75, 1.1];
const PAL_A = ["#c9d3d7", "#b98b55", "#8c9093", "#2a6fb5", "#e8e8e2", "#a33a2b", "#d8c39a"];
const PAL_B = ["#c9d3d7", "#b98b55", "#8c9093", "#e8e8e2", "#3e6b35", "#1d1d1f", "#7a5ca8"];
const PAL_G = ["#3f7a35", "#2e5f9e", "#c9d3d7", "#7a8f3a", "#b7322a"];
const BOTTLES = ["#e04a2b", "#2a6fb5", "#f2c200", "#e8e8e2", "#3e8d4a", "#222222"];

function MatTiles({ w, h }: { w: number; h: number }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let x = -w / 2 + 0.5; x < w / 2 - 0.01; x += 0.5) pts.push(x, 0.018, -h / 2, x, 0.018, h / 2);
    for (let z = -h / 2 + 0.5; z < h / 2 - 0.01; z += 0.5) pts.push(-w / 2, 0.018, z, w / 2, 0.018, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [w, h]);
  return (
    <>
      <Bx s={[w, 0.016, h]} c="#2b2e2d" shadow={false} />
      <lineSegments geometry={geo}>
        <lineBasicMaterial color="#181a19" />
      </lineSegments>
    </>
  );
}

function ToolShelf({ w, h }: { w: number; h: number }) {
  const bottles = useMemo(() => {
    const r = rng("toolshelf");
    const out: { r: number; len: number; c: string; p: V3 }[] = [];
    for (let x = -w / 2 + 0.06; x < w / 2 - 0.05; x += 0.07 + r() * 0.06) {
      const len = 0.1 + r() * 0.18;
      out.push({ r: 0.025 + r() * 0.02, len, c: BOTTLES[Math.floor(r() * BOTTLES.length)], p: [x, 1.58 + len / 2, (r() - 0.5) * 0.1] });
    }
    return out;
  }, [w]);
  return (
    <>
      <Bx s={[w, 0.03, h]} p={[0, 1.55, 0]} c="#6b4a2b" />
      {bottles.map((b, i) => <Cyl key={i} {...b} />)}
    </>
  );
}

function ModelInner({ id, w, h, upright }: ModelProps): ReactNode {
  switch (id) {
    case "treadmill": {
      const cx = -w / 2 + 0.16;
      return (
        <>
          <Bx s={[w, 0.2, h]} c="#2a2c2d" />
          <Bx s={[w - 0.35, 0.02, h - 0.28]} p={[0.08, 0.2, 0]} c="#0e0f0f" />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Bx s={[0.06, 1.05, 0.07]} p={[cx, 0.2, s * (h / 2 - 0.07)]} c="#8e9498" o={{ metalness: 0.4 }} />
              <Bx s={[0.55, 0.045, 0.045]} p={[cx + 0.26, 1.0, s * (h / 2 - 0.07)]} c="#8e9498" o={{ metalness: 0.4 }} />
            </group>
          ))}
          <Bx s={[0.28, 0.07, h - 0.05]} p={[cx + 0.02, 1.22, 0]} c="#18191a" />
          <Bx s={[0.04, 0.05, 0.36]} p={[cx + 0.14, 1.24, 0]} c="#d23b2a" />
        </>
      );
    }
    case "tv":
      return (
        <>
          <Bx s={[w, 0.58, 0.05]} p={[0, 1.45, 0]} c="#0d0d0d" />
          <Bx s={[w - 0.05, 0.53, 0.012]} p={[0, 1.475, 0.03]} c="#2f63d6" o={{ emissive: "#2c5fd0", emissiveIntensity: 0.9 }} shadow={false} />
        </>
      );
    case "mats":
      return <MatTiles w={w} h={h} />;
    case "spin":
      return (
        <>
          <Bx s={[w, 0.05, 0.12]} c="#2a2a2a" />
          <Bx s={[0.08, 0.05, h]} p={[-w / 2 + 0.1, 0, 0]} c="#2a2a2a" />
          <Bx s={[0.08, 0.05, h]} p={[w / 2 - 0.1, 0, 0]} c="#2a2a2a" />
          <Cyl r={0.24} len={0.07} c="#d9462b" p={[-w / 2 + 0.32, 0.36, 0]} axis="z" />
          <Rod a={[-w / 2 + 0.32, 0.36, 0]} b={[0.08, 0.05, 0]} r={0.035} c="#333333" />
          <Rod a={[0.06, 0.05, 0]} b={[0.14, 0.8, 0]} r={0.035} c="#333333" />
          <Bx s={[0.26, 0.06, 0.17]} p={[0.15, 0.8, 0]} c="#111111" />
          <Rod a={[-w / 2 + 0.32, 0.36, 0]} b={[-0.3, 1.0, 0]} r={0.035} c="#333333" />
          <Bx s={[0.07, 0.04, 0.46]} p={[-0.31, 1.0, 0]} c="#111111" />
        </>
      );
    case "bench":
      return (
        <>
          <Bx s={[0.29, 0.07, h * 0.6]} p={[0, 0.43, h * 0.18]} c="#151617" />
          <Bx s={[0.29, 0.07, h * 0.32]} p={[0, 0.43, -h * 0.3]} c="#151617" />
          <Bx s={[0.06, 0.4, 0.06]} p={[0, 0.03, h / 2 - 0.12]} c="#2c2e30" />
          <Bx s={[0.06, 0.4, 0.06]} p={[0, 0.03, -h / 2 + 0.12]} c="#2c2e30" />
          <Bx s={[0.06, 0.05, h - 0.1]} p={[0, 0.25, 0]} c="#2c2e30" />
          <Bx s={[w, 0.05, 0.07]} p={[0, 0, h / 2 - 0.08]} c="#2c2e30" />
          <Bx s={[w, 0.05, 0.07]} p={[0, 0, -h / 2 + 0.08]} c="#2c2e30" />
        </>
      );
    case "pad":
      return upright ? (
        <>
          <Bx s={[w, 1.35, h]} c="#2a2c2e" />
          <Bx s={[w - 0.12, 1.2, 0.01]} p={[0, 0.08, h / 2]} c="#0f0f0f" />
        </>
      ) : (
        <>
          <Bx s={[w, 0.11, h]} c="#2a2c2e" />
          <Bx s={[w - 0.2, 0.012, h - 0.12]} p={[0, 0.11, 0]} c="#0f0f0f" />
        </>
      );
    case "weights":
      return (
        <>
          {[-0.07, 0.07].map((z) => (
            <group key={z}>
              <Cyl r={0.012} len={w - 0.1} c="#9a9da0" p={[0, 0.07, z]} axis="x" o={{ metalness: 0.5 }} />
              <Cyl r={0.07} len={0.07} c="#2e3032" p={[-w / 2 + 0.08, 0.07, z]} axis="x" />
              <Cyl r={0.07} len={0.07} c="#2e3032" p={[w / 2 - 0.08, 0.07, z]} axis="x" />
            </group>
          ))}
        </>
      );
    case "shelfA":
      return <Shelving id={id} w={w} h={h} height={1.8} levels={SHELF_LEVELS} palette={PAL_A} />;
    case "shelfB":
      return <Shelving id={id} w={w} h={h} height={1.8} levels={SHELF_LEVELS} palette={PAL_B} />;
    case "garden":
      return <Shelving id={id} w={w} h={h} height={1.4} levels={GARDEN_LEVELS} palette={PAL_G} />;
    case "toolshelf":
      return <ToolShelf w={w} h={h} />;
    case "ladder":
      return (
        <>
          {[-1, 1].map((s) => <Bx key={s} s={[0.035, 1.55, 0.05]} p={[s * (w / 2 - 0.02), 0, 0]} c="#c3c7cb" o={{ metalness: 0.5 }} />)}
          {[0.25, 0.53, 0.81, 1.09, 1.37].map((y) => <Bx key={y} s={[w, 0.025, h]} p={[0, y, 0]} c="#b5babe" o={{ metalness: 0.5 }} />)}
        </>
      );
    case "mtb":
      return <Bike w={w} h={h} frame="#c9462a" />;
    case "road":
      return <Bike w={w} h={h} frame="#2b2d30" />;
    case "chair":
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return <Rod key={i} a={[0, 0.07, 0]} b={[Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3]} r={0.02} c="#222222" />;
          })}
          <Cyl r={0.03} len={0.36} c="#555555" p={[0, 0.25, 0]} />
          <Bx s={[0.5, 0.08, 0.48]} p={[0, 0.43, 0]} c="#1b1b1b" />
          <Bx s={[0.48, 0.55, 0.07]} p={[0, 0.55, -0.22]} c="#1b1b1b" />
          <Bx s={[w, 1.12, h]} c="#dfe8ec" o={{ transparent: true, opacity: 0.32, roughness: 0.15 }} shadow={false} />
        </>
      );
    case "shoes":
      return (
        <>
          <Bx s={[w, 0.012, h]} c="#b78c5a" shadow={false} />
          <Bx s={[0.11, 0.19, 0.27]} p={[-0.17, 0, 0]} c="#6b4428" />
          <Bx s={[0.11, 0.19, 0.27]} p={[-0.04, 0, 0.02]} c="#6b4428" />
          <Bx s={[0.1, 0.09, 0.26]} p={[0.09, 0, 0]} c="#1e1e1e" />
          <Bx s={[0.1, 0.09, 0.26]} p={[0.2, 0, -0.02]} c="#1e1e1e" />
        </>
      );
    case "bags":
      return (
        <>
          <Bx s={[w, 0.45, h]} c="#b3262c" />
          <Bx s={[w * 0.75, 0.35, h * 0.7]} p={[0, 0.45, 0]} c="#1d1d1f" />
          <Bx s={[0.36, 0.22, 0.26]} p={[0.08, 0.8, 0]} c="#ecece6" />
        </>
      );
    case "peacock":
      return (
        <>
          <Cyl r={0.012} len={0.2} c="#555555" p={[0, 0.1, 0]} />
          <mesh position={[0, 0.28, 0]} scale={[1.2, 1, 1]} castShadow>
            <sphereGeometry args={[0.11, 16, 12]} />
            <meshStandardMaterial color="#1f6e8c" roughness={0.5} />
          </mesh>
          <Rod a={[0.08, 0.32, 0]} b={[0.11, 0.5, 0]} r={0.025} c="#1f6e8c" />
          <mesh position={[0.11, 0.52, 0]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshStandardMaterial color="#1f6e8c" roughness={0.5} />
          </mesh>
          <mesh position={[-0.1, 0.3, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <circleGeometry args={[0.22, 20, 0, Math.PI]} />
            <meshStandardMaterial color="#2f9e8f" side={THREE.DoubleSide} />
          </mesh>
        </>
      );
    case "rail": {
      const xs = [0, 1, 2, 3].map((i) => -w / 2 + 0.07 + (i * (w - 0.14)) / 3);
      return (
        <>
          <Bx s={[w, 0.04, 0.05]} p={[0, 1.45, 0]} c="#9b9ea0" />
          {xs.map((x) => (
            <group key={x}>
              <Rod a={[x, 1.5, -0.07]} b={[x, 0.16, -0.09]} r={0.015} c="#8a6a45" />
              <Bx s={[0.17, 0.2, 0.03]} p={[x, 0, -0.09]} c="#555555" />
            </group>
          ))}
        </>
      );
    }
    case "bucket":
      return (
        <>
          <Bx s={[0.36, 0.04, 0.36]} c="#333333" />
          <Cyl r={0.19} len={0.34} c="#b7322a" p={[0, 0.23, 0]} />
        </>
      );
    case "stool":
      return (
        <>
          {corners(w, h, 0.03).map(([x, z], i) => <Bx key={i} s={[0.035, 0.45, 0.035]} p={[x, 0, z]} c="#c9a877" />)}
          <Bx s={[w, 0.035, h]} p={[0, 0.45, 0]} c="#d7b98a" />
          <Bx s={[w, 0.03, h * 0.5]} p={[0, 0.22, h * 0.18]} c="#d7b98a" />
        </>
      );
    case "bin":
      return (
        <>
          <Bx s={[w, 0.86, h]} c="#1d1e1f" />
          <Bx s={[w + 0.02, 0.04, h + 0.02]} p={[0, 0.86, 0]} c="#2a2b2c" />
        </>
      );
    case "cabinet":
      return (
        <>
          <Bx s={[w, 0.86, h]} c="#eef0ec" />
          <Bx s={[w + 0.03, 0.04, h + 0.03]} p={[0, 0.86, 0]} c="#c9b08f" />
          <Bx s={[0.012, 0.14, 0.02]} p={[-w / 2 - 0.006, 0.62, 0.18]} c="#888888" />
        </>
      );
    case "washer":
      return (
        <>
          <Bx s={[w, 0.85, h]} c="#f4f5f3" />
          <Cyl r={0.2} len={0.02} c="#a3abb0" p={[-w / 2 - 0.008, 0.45, 0]} axis="x" o={{ metalness: 0.4 }} />
          <Cyl r={0.15} len={0.02} c="#2b3a44" p={[-w / 2 - 0.016, 0.45, 0]} axis="x" o={{ roughness: 0.2 }} />
          <Bx s={[0.015, 0.07, h - 0.12]} p={[-w / 2 - 0.006, 0.75, 0]} c="#dcdedb" />
        </>
      );
    case "hoists":
      return (
        <>
          {[-0.6, 0.6].map((x) => (
            <group key={x}>
              <Rod a={[x, 2.42, -0.2]} b={[x, 2.2, -0.2]} r={0.006} c="#dddddd" />
              <Rod a={[x, 2.42, 0.2]} b={[x, 2.2, 0.2]} r={0.006} c="#dddddd" />
              <Cyl r={0.05} len={0.04} c="#888888" p={[x, 2.4, 0]} axis="z" />
            </group>
          ))}
        </>
      );
    case "rack":
      return (
        <>
          {corners(w, h, 0.03).map(([x, z], i) => <Rod key={i} a={[x, 2.45, z]} b={[x, 1.95, z]} r={0.015} c="#5d6166" />)}
          <Bx s={[w, 0.03, h]} p={[0, 1.95, 0]} c="#5d6166" />
          <Bx s={[0.55, 0.3, 0.42]} p={[-0.5, 1.98, -0.2]} c="#b98b55" />
          <Bx s={[0.5, 0.25, 0.5]} p={[0.15, 1.98, 0.15]} c="#b3262c" />
          <Bx s={[0.4, 0.22, 0.35]} p={[0.6, 1.98, -0.25]} c="#c9d3d7" />
        </>
      );
    default:
      return <Bx s={[w, 0.6, h]} c="#999999" />;
  }
}

export const Model = memo(ModelInner);
