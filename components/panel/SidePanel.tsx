"use client";

import { useMemo, useRef, useState } from "react";
import { BY_ID, CATS, STEPS } from "@/lib/data";
import { computeIssues, floorStats, footprint, mountOf } from "@/lib/geometry";
import { exportState, layoutKey, useStore } from "@/lib/store";

function Delta({ value, unit, goodWhenUp }: { value: number; unit: string; goodWhenUp: boolean }) {
  const rounded = Math.abs(value) < 0.05 ? 0 : value;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  const tone = rounded === 0 ? "" : (rounded > 0) === goodWhenUp ? "up" : "down";
  const shown = unit === "m²" ? Math.abs(rounded).toFixed(1) : Math.round(Math.abs(rounded)).toString();
  const direction = tone === "up" ? "improvement" : tone === "down" ? "worse" : "no change";
  return <span className={`delta ${tone}`} aria-label={`${sign}${shown}${unit} vs now, ${direction}`}>{sign}{shown}{unit === "%" ? "%" : ""} vs now</span>;
}

function Stats() {
  const layouts = useStore((s) => s.layouts);
  const dims = useStore((s) => s.dims);
  const key = useStore(layoutKey);
  const { cur, now, issues, nowIssues } = useMemo(() => ({
    cur: floorStats(layouts[key], dims),
    now: floorStats(layouts.now, dims),
    issues: computeIssues(layouts[key], dims).length,
    nowIssues: computeIssues(layouts.now, dims).length,
  }), [layouts, key, dims]);
  const plan = key !== "now";
  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading">{plan ? "Floor check vs now" : "Floor check"}</h2>
      <div className="tiles" role="list">
        <div className="tile" role="listitem">
          <b aria-label={`${cur.open.toFixed(1)} square meters open floor`}>{cur.open.toFixed(1)}</b><small>m² open floor</small>
          {plan && <Delta value={cur.open - now.open} unit="m²" goodWhenUp />}
        </div>
        <div className="tile" role="listitem">
          <b aria-label={`${Math.round(cur.training)} percent training floor clear`}>{Math.round(cur.training)}%</b><small>training floor clear</small>
          {plan && <Delta value={cur.training - now.training} unit="%" goodWhenUp />}
        </div>
        <div className="tile" role="listitem">
          <b>{issues}</b><small>problems</small>
          {plan && <Delta value={issues - nowIssues} unit="" goodWhenUp={false} />}
        </div>
      </div>
    </section>
  );
}

function Inspector() {
  const selected = useStore((s) => s.selected);
  const st = useStore((s) => (s.selected ? s.layouts[layoutKey(s)][s.selected] : undefined));
  const { rotate, setWhere, focus } = useStore.getState();
  if (!selected || !st) {
    return (
      <section aria-labelledby="selected-heading">
        <h2 id="selected-heading">Selected</h2>
        <p className="empty">Tap anything in the garage to see what it is and why it goes where it goes.</p>
      </section>
    );
  }
  const it = BY_ID[selected];
  const m = mountOf(it, st);
  const [w, h] = footprint(it, st);
  const where = { room: "In the garage", remove: "In the Out pile", shelve: "Put away on a shelf" }[st.where];
  const mountTxt = { floor: "Floor", wall: "Wall-mounted", overhead: "Overhead", mat: "Floor covering" }[m];
  return (
    <section aria-labelledby="selected-heading">
      <h2 id="selected-heading">Selected</h2>
      <div className="inspect">
        <div className="nm">
          {it.name}
          <span className="chip" style={{ background: `var(--${it.cat}-l)` }}>{CATS[it.cat]}</span>
          {it.locked && <span className="chip muted">Stays put</span>}
        </div>
        <div className="meta">{w.toFixed(2)} × {h.toFixed(2)} m · {mountTxt} · {where}</div>
        <p>{it.note}</p>
        <div className="row">
          {st.where === "room" && <button className="btn" type="button" onClick={() => focus(selected)}>Look at it</button>}
          {!it.locked && (
            <>
              <button className="btn" type="button" onClick={() => rotate(selected)}>Rotate 90°</button>
              {st.where !== "remove" && <button className="btn" type="button" onClick={() => setWhere(selected, "remove")}>Send to Out pile</button>}
              {st.where !== "shelve" && m === "floor" && <button className="btn" type="button" onClick={() => setWhere(selected, "shelve")}>Put away</button>}
              {st.where !== "room" && <button className="btn" type="button" onClick={() => setWhere(selected, "room")}>Bring back in</button>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Problems() {
  const layout = useStore((s) => s.layouts[layoutKey(s)]);
  const dims = useStore((s) => s.dims);
  const select = useStore((s) => s.select);
  const issues = useMemo(() => computeIssues(layout, dims), [layout, dims]);
  return (
    <section aria-labelledby="problems-heading">
      <h2 id="problems-heading">Problems</h2>
      {issues.length === 0 ? (
        <p className="allgood">Nothing in the way. Door swings free, training floor clear, shelves reachable.</p>
      ) : (
        <ul className="issues">
          {issues.map((i, k) => (
            <li key={k}>
              <button type="button" onClick={() => select(i.ids[0])} aria-label={`Problem: ${i.text}. Click to select item.`}><span className="dot" aria-hidden="true" />{i.text}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Steps() {
  const checks = useStore((s) => s.checks);
  const kit = useStore((s) => s.kit);
  const toggle = useStore((s) => s.toggleCheck);
  return (
    <section aria-labelledby="steps-heading">
      <h2 id="steps-heading">The reset, in order</h2>
      <ol className="steps" aria-label="Reset checklist">
        {STEPS.filter((s) => !s.kit || kit).map((s) => (
          <li key={s.id} className={`${checks[s.id] ? "done" : ""}${s.kit ? " kitstep" : ""}`}>
            <input type="checkbox" id={`step-${s.id}`} checked={!!checks[s.id]} onChange={() => toggle(s.id)} />
            <label htmlFor={`step-${s.id}`}>
              <b>{s.title}</b>
              <p>{s.body}</p>
            </label>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RoomSize() {
  const dims = useStore((s) => s.dims);
  const setDims = useStore((s) => s.setDims);
  const importJSON = useStore((s) => s.importJSON);
  const [w, setW] = useState(dims.W.toFixed(2));
  const [d, setD] = useState(dims.D.toFixed(2));
  const file = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `garage-layout-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section aria-labelledby="roomsize-heading">
      <h2 id="roomsize-heading">Room size</h2>
      <form
        className="dims"
        onSubmit={(e) => {
          e.preventDefault();
          setDims({ W: parseFloat(w) || dims.W, D: parseFloat(d) || dims.D });
        }}
      >
        <label htmlFor="dim-w">Width (m)<input id="dim-w" type="number" min={2.2} max={8} step={0.05} value={w} onChange={(e) => setW(e.target.value)} /></label>
        <label htmlFor="dim-d">Depth (m)<input id="dim-d" type="number" min={3} max={12} step={0.05} value={d} onChange={(e) => setD(e.target.value)} /></label>
        <button className="btn" type="submit">Apply</button>
      </form>
      <p className="note">Estimated from the video at 3.50 × 6.00 m. Measure wall to wall and pop the real numbers in. Everything by the right and back walls shifts with them.</p>
      <h2 className="sub">Save &amp; move layouts</h2>
      <div className="row">
        <button className="btn" type="button" onClick={download}>Export layout</button>
        <button className="btn" type="button" onClick={() => file.current?.click()}>Import layout</button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          aria-label="Import layout file"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (importJSON(await f.text())) {
              const s = useStore.getState();
              setW(s.dims.W.toFixed(2));
              setD(s.dims.D.toFixed(2));
            }
            e.target.value = "";
          }}
        />
      </div>
      <p className="note">Layouts save in this browser automatically. Export a file to move them to another device.</p>
    </section>
  );
}

export function SidePanel() {
  return (
    <aside className="side">
      <Stats />
      <Inspector />
      <Problems />
      <Steps />
      <RoomSize />
    </aside>
  );
}
