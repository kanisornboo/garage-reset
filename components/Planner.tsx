"use client";

import { useEffect, useState } from "react";
import { CATS, type Category } from "@/lib/data";
import { useStore, type CamName } from "@/lib/store";
import Scene from "./scene/Scene";
import { SidePanel } from "./panel/SidePanel";

const CAMS: [CamName, string][] = [
  ["corner", "Corner"],
  ["top", "Top down"],
  ["door", "From side door"],
  ["roller", "From roller door"],
];

function TopBar() {
  const mode = useStore((s) => s.mode);
  const kit = useStore((s) => s.kit);
  const zones = useStore((s) => s.zones);
  const labels = useStore((s) => s.labels);
  const { setMode, setKit, setZones, setLabels, rotate, resetLayout } = useStore.getState();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <header className="top">
      <div className="brand">
        <span className="tape" aria-hidden="true" />
        <div>
          <h1>Garage reset</h1>
          <p>3D garage plan, sized from your video</p>
        </div>
      </div>
      <div className="controls">
        <div className="seg" role="group" aria-label="Layout">
          <button type="button" aria-pressed={mode === "now"} onClick={() => setMode("now")}>Now</button>
          <button type="button" aria-pressed={mode === "plan"} onClick={() => setMode("plan")}>Plan</button>
        </div>
        <label className={`chk${mode === "now" ? " disabled" : ""}`} title="Ceiling bike hoists and an overhead rack">
          <input type="checkbox" checked={kit} disabled={mode === "now"} onChange={(e) => setKit(e.target.checked)} /> New kit
        </label>
        <label className="chk"><input type="checkbox" checked={zones} onChange={(e) => setZones(e.target.checked)} /> Zones</label>
        <label className="chk"><input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Labels</label>
        <button className="btn" type="button" onClick={() => rotate()}>Rotate (R)</button>
        <button
          className={`btn${armed ? " warn" : ""}`}
          type="button"
          aria-live="polite"
          aria-label={armed ? "Confirm reset: tap again to reset layout" : "Reset layout"}
          onClick={() => {
            if (!armed) return setArmed(true);
            setArmed(false);
            resetLayout();
          }}
        >
          {armed ? "Tap again to reset" : "Reset layout"}
        </button>
      </div>
    </header>
  );
}

function StageOverlay() {
  const camTo = useStore((s) => s.camTo);
  const cam = useStore((s) => s.cam.name);
  const kit = useStore((s) => s.mode === "plan" && s.kit);
  const cats: Category[] = ["gym", "storage", "bikes", "garden", "utility", ...(kit ? (["kit"] as Category[]) : [])];
  return (
    <>
      <div className="camnav" role="group" aria-label="Camera">
        {CAMS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={cam === k} onClick={() => camTo(k)}>{label}</button>
        ))}
      </div>
      <div className="legend" role="list" aria-label="Zone categories">
        {cats.map((c) => (
          <span key={c} role="listitem"><i aria-hidden="true" style={{ background: `var(--${c}-f)`, borderColor: `var(--${c}-l)` }} />{CATS[c]}</span>
        ))}
        <span role="listitem"><i aria-hidden="true" style={{ background: "transparent", borderColor: "var(--danger)" }} />Problem</span>
      </div>
      <div className="hint">Drag empty floor to orbit · scroll or pinch to zoom · drag an item to move it · double-click to look at it</div>
    </>
  );
}

function Toast() {
  const toast = useStore((s) => s.toast);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  return <div className={`toast${shown ? " on" : ""}`} role="status" aria-live="polite">{toast?.text}</div>;
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      const s = useStore.getState();
      if (e.key === "r" || e.key === "R") {
        s.rotate();
        e.preventDefault();
      } else if (e.key === "Escape") {
        s.select(null);
      } else {
        const mv: Record<string, [number, number]> = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] };
        if (mv[e.key] && s.selected) {
          s.nudge(...mv[e.key]);
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export default function Planner() {
  useKeyboard();
  return (
    <div className="app">
      <TopBar />
      <main className="body">
        <section className="stage" aria-label="Garage in 3D">
          <Scene />
          <StageOverlay />
        </section>
        <SidePanel />
      </main>
      <Toast />
    </div>
  );
}
