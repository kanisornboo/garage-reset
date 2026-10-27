"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { BY_ID, ITEMS, type Placement } from "@/lib/data";
import { computeIssues, mountOf, stagedPositions } from "@/lib/geometry";
import { layoutKey, useStore } from "@/lib/store";
import type { Palette } from "@/lib/theme";
import { Model } from "./models";
import type { LayerRef } from "./Room";

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const HOIST_HEIGHT = 1.62;
const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface NodeProps {
  id: string;
  st: Placement;
  pos: { x: number; y: number };
  selected: boolean;
  bad: boolean;
  showLabel: boolean;
  pal: Palette;
  layer: LayerRef;
}

function ItemNode({ id, st, pos, selected, bad, showLabel, pal, layer }: NodeProps) {
  const it = BY_ID[id];
  const mount = mountOf(it, st);
  const w = st.w ?? it.w, h = st.h ?? it.h;
  const upright = st.w !== undefined;
  const raised = mount === "overhead" && it.cat !== "kit";

  const group = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const [bounds, setBounds] = useState<THREE.Box3 | null>(null);
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;
  const { select, setDragging, moveItem, drop, notify, focus } = useStore.getState();
  const dragging = useStore((s) => s.dragging === id);

  // Measure the model in the group's local space for the highlight box and label height
  useLayoutEffect(() => {
    const g = group.current, m = model.current;
    if (!g || !m) return;
    g.updateWorldMatrix(true, true);
    const inv = g.matrixWorld.clone().invert();
    const box = new THREE.Box3();
    m.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(inv));
    });
    setBounds(box);
  }, [id, w, h, upright, raised]);

  // Ease towards the target spot; hop over things when travelling far
  const tx = pos.x, tz = -pos.y, try_ = st.r === 90 ? Math.PI / 2 : 0;
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (dragging || reduceMotion) {
      g.position.set(tx, dragging ? 0.04 : 0, tz);
      g.rotation.y = try_;
      g.scale.setScalar(1);
      return;
    }
    const k = Math.min(dt, 0.05);
    g.position.x = THREE.MathUtils.damp(g.position.x, tx, 6, k);
    g.position.z = THREE.MathUtils.damp(g.position.z, tz, 6, k);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, try_, 8, k);
    const remaining = Math.hypot(tx - g.position.x, tz - g.position.z);
    g.position.y = THREE.MathUtils.damp(g.position.y, Math.min(0.3, remaining * 0.25), 10, k);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, 1, 7, k));
  });

  const edges = useMemo(() => {
    if (!bounds) return null;
    const s = bounds.getSize(new THREE.Vector3());
    return new THREE.EdgesGeometry(new THREE.BoxGeometry(s.x + 0.06, s.y + 0.06, s.z + 0.06));
  }, [bounds]);
  const centre = bounds?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();
  const top = bounds?.max.y ?? 0.5;

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    select(id);
    if (it.locked) {
      notify(`${it.name} stays put`);
      return;
    }
    const p = e.ray.intersectPlane(GROUND, new THREE.Vector3());
    if (!p) return;
    drag.current = { dx: pos.x - p.x, dy: pos.y + p.z, sx: e.clientX, sy: e.clientY, moved: false };
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    if (controls) controls.enabled = false;
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(id);
    }
    const p = e.ray.intersectPlane(GROUND, new THREE.Vector3());
    if (p) moveItem(id, p.x + d.dx, -p.z + d.dy);
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    drag.current = null;
    (e.target as unknown as Element).releasePointerCapture?.(e.pointerId);
    if (controls) controls.enabled = true;
    if (d.moved) {
      setDragging(null);
      drop(id);
    }
  };

  const decal = mount !== "wall" && mount !== "mat";
  const interactive = mount !== "mat";

  return (
    <group
      ref={group}
      scale={0.001}
      position={[tx, 0, tz]}
      rotation={[0, try_, 0]}
      onPointerDown={interactive ? onDown : undefined}
      onPointerMove={interactive ? onMove : undefined}
      onPointerUp={interactive ? onUp : undefined}
      onPointerCancel={interactive ? onUp : undefined}
      onDoubleClick={interactive ? (e) => { e.stopPropagation(); focus(id); } : undefined}
      onPointerOver={interactive ? (e) => { e.stopPropagation(); document.body.style.cursor = it.locked ? "pointer" : "grab"; } : undefined}
      onPointerOut={interactive ? () => { document.body.style.cursor = ""; } : undefined}
    >
      <group ref={model} position={[0, raised ? HOIST_HEIGHT : 0, 0]}>
        <Model id={id} w={w} h={h} upright={upright} />
      </group>
      {decal && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, 0]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color={pal[`${it.cat}-f` as const]} transparent opacity={mount === "overhead" ? 0.35 : 0.8} depthWrite={false} />
        </mesh>
      )}
      {edges && (selected || bad) && (
        <lineSegments geometry={edges} position={centre} renderOrder={999}>
          <lineBasicMaterial color={selected ? pal.accent : pal.danger} transparent depthTest={false} />
        </lineSegments>
      )}
      {(showLabel || selected) && (
        <Html position={[0, top + 0.1, 0]} portal={layer} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className={`lbl3${selected ? " sel" : ""}${bad && !selected ? " bad" : ""}`}>{it.name}</div>
        </Html>
      )}
    </group>
  );
}

export function Items({ pal, layer }: { pal: Palette; layer: LayerRef }) {
  const layout = useStore((s) => s.layouts[layoutKey(s)]);
  const dims = useStore((s) => s.dims);
  const narrow = useStore((s) => s.narrow);
  const selected = useStore((s) => s.selected);
  const labels = useStore((s) => s.labels);

  const staged = useMemo(() => stagedPositions(layout, dims, narrow), [layout, dims, narrow]);
  const bad = useMemo(() => new Set(computeIssues(layout, dims).flatMap((i) => i.ids)), [layout, dims]);

  return (
    <>
      {ITEMS.filter((it) => layout[it.id]).map((it) => {
        const st = layout[it.id];
        const mount = mountOf(it, st);
        return (
          <ItemNode
            key={`${it.id}:${mount}:${st.w ?? ""}`}
            id={it.id}
            st={st}
            pos={st.where === "room" ? st : staged[it.id] ?? st}
            selected={selected === it.id}
            bad={bad.has(it.id) && st.where === "room"}
            showLabel={labels && mount !== "mat" && mount !== "wall"}
            pal={pal}
            layer={layer}
          />
        );
      })}
    </>
  );
}
