"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore, type CamName } from "@/lib/store";
import { usePalette } from "@/lib/theme";
import { Items } from "./Items";
import { Room } from "./Room";

type Shot = { pos: THREE.Vector3; target: THREE.Vector3 };

function presetShot(name: CamName, W: number, D: number, narrow: boolean): Shot {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  switch (name) {
    case "top":
      return narrow
        ? { pos: v(W / 2, 13, (-D + 2.3) / 2 + 0.02), target: v(W / 2, 0, (-D + 2.3) / 2) }
        : { pos: v((W + 2.15) / 2, 10.5, -D / 2 + 0.02), target: v((W + 2.15) / 2, 0, -D / 2) };
    case "door":
      return { pos: v(W - 0.42, 1.65, -D + 0.15), target: v(W / 2 - 0.5, 0.7, -0.8) };
    case "roller":
      return { pos: v(W / 2, 1.75, 1.8), target: v(W / 2, 0.8, -D / 2) };
    case "corner":
    default: {
      const k = narrow ? 1.45 : 1.22;
      const t = v(W / 2 + 0.2, 0.4, -D / 2 + 0.3);
      return { pos: v(t.x + (W / 2 + 2.1) * k, t.y + 3.4 * k, t.z + (D / 2 + 2.2) * k), target: t };
    }
  }
}

/** Glides the camera to presets and focus targets; any manual orbit cancels the glide. */
function CameraRig() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as (THREE.EventDispatcher<{ start: object }> & { target: THREE.Vector3; update: () => void }) | null;
  const cam = useStore((s) => s.cam);
  const dims = useStore((s) => s.dims);
  const narrow = useStore((s) => s.narrow);
  const goal = useRef<Shot | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!controls) return;
    let shot: Shot;
    if (cam.name === "focus" && cam.target) {
      const s = useStore.getState();
      const st = s.layouts[s.mode === "now" ? "now" : s.kit ? "kit" : "plan"][cam.target];
      if (!st || st.where !== "room") return;
      const t = new THREE.Vector3(st.x, 0.5, -st.y);
      shot = { pos: t.clone().add(new THREE.Vector3(1.6, 1.5, 1.9)), target: t };
    } else {
      shot = presetShot(cam.name as CamName, dims.W, dims.D, narrow);
    }
    if (first.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      first.current = false;
      camera.position.copy(shot.pos);
      controls.target.copy(shot.target);
      controls.update();
      goal.current = null;
    } else {
      goal.current = shot;
    }
  }, [cam, controls, camera, dims, narrow]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => (goal.current = null);
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, dt) => {
    const g = goal.current;
    if (!g || !controls) return;
    const k = 1 - Math.exp(-6 * Math.min(dt, 0.05));
    camera.position.lerp(g.pos, k);
    controls.target.lerp(g.target, k);
    controls.update();
    if (camera.position.distanceTo(g.pos) < 0.01 && controls.target.distanceTo(g.target) < 0.01) goal.current = null;
  });
  return null;
}

/** Phones get drop zones in front of the garage and a wider lens. */
function ViewportWatcher() {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const setNarrow = useStore((s) => s.setNarrow);
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    setNarrow(aspect < 0.78);
    camera.fov = aspect < 0.8 ? 60 : 42;
    camera.updateProjectionMatrix();
  }, [size, camera, setNarrow]);
  return null;
}

function Lights({ W, D }: { W: number; D: number }) {
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <hemisphereLight args={["#ffffff", "#5a5a52", 0.9 * Math.PI]} />
      <primitive object={target} position={[W / 2, 0, -D / 2]} />
      <directionalLight
        target={target}
        position={[W / 2 + 2.6, 7, 3.2]}
        intensity={0.62 * Math.PI}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
      <pointLight position={[W / 2, 2.25, -D / 2]} intensity={0.35 * Math.PI} distance={12} decay={1} color="#fff2dd" />
    </>
  );
}

export default function Scene() {
  const pal = usePalette();
  const W = useStore((s) => s.dims.W), D = useStore((s) => s.dims.D);
  const select = useStore((s) => s.select);
  const down = useRef<{ x: number; y: number } | null>(null);
  const layer = useRef<HTMLDivElement>(null!);

  return (
    <div
      className="canvas-wrap"
      onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
    >
      {/* Fixed layer for floating labels (drei <Html> portals here, so labels never land in a stale container) */}
      <div ref={layer} className="label-layer" />
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 42, near: 0.05, far: 120, position: [W + 4, 5, 5] }}
        onPointerMissed={(e) => {
          const d = down.current;
          if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) select(null);
        }}
        aria-label="3D model of the garage. Drag empty space to orbit, drag an item to move it."
      >
        <color attach="background" args={[pal.stage]} />
        <Lights W={W} D={D} />

        <Room pal={pal} layer={layer} />
        <Items pal={pal} layer={layer} />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.09}
          maxPolarAngle={Math.PI * 0.495}
          minDistance={1}
          maxDistance={24}
          screenSpacePanning
        />
        <CameraRig />
        <ViewportWatcher />
      </Canvas>
    </div>
  );
}
