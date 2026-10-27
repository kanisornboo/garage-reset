"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { BY_ID, DEFAULT_DIMS, preset, type Dims, type Layout, type LayoutKey, type Where } from "./data";
import { mountOf, snap, stagingBoxes } from "./geometry";

export type Mode = "now" | "plan";
export type CamName = "corner" | "top" | "door" | "roller";

interface Persisted {
  dims: Dims;
  mode: Mode;
  kit: boolean;
  zones: boolean;
  labels: boolean;
  layouts: Record<LayoutKey, Layout>;
  checks: Record<string, boolean>;
}

interface Transient {
  selected: string | null;
  dragging: string | null;
  narrow: boolean;
  cam: { name: CamName | "focus"; target?: string; nonce: number };
  toast: { text: string; nonce: number } | null;
}

interface Actions {
  setMode: (m: Mode) => void;
  setKit: (v: boolean) => void;
  setZones: (v: boolean) => void;
  setLabels: (v: boolean) => void;
  select: (id: string | null) => void;
  setDragging: (id: string | null) => void;
  moveItem: (id: string, x: number, y: number) => void;
  nudge: (dx: number, dy: number) => void;
  setWhere: (id: string, where: Where) => void;
  rotate: (id?: string | null) => void;
  drop: (id: string) => void;
  resetLayout: () => void;
  setDims: (d: Dims) => void;
  toggleCheck: (id: string) => void;
  setNarrow: (v: boolean) => void;
  camTo: (name: CamName) => void;
  focus: (id: string) => void;
  notify: (text: string) => void;
  importJSON: (text: string) => boolean;
}

export type State = Persisted & Transient & Actions;

export const layoutKey = (s: Pick<Persisted, "mode" | "kit">): LayoutKey => (s.mode === "now" ? "now" : s.kit ? "kit" : "plan");

const freshLayouts = (dims: Dims): Record<LayoutKey, Layout> => ({
  now: preset("now", dims),
  plan: preset("plan", dims),
  kit: preset("kit", dims),
});

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Replace one item's placement in the active layout */
      const patch = (id: string, fn: (p: Layout[string]) => Layout[string]) => {
        const s = get();
        const k = layoutKey(s);
        const cur = s.layouts[k][id];
        if (!cur) return;
        set({ layouts: { ...s.layouts, [k]: { ...s.layouts[k], [id]: fn(cur) } } });
      };
      const notify = (text: string) => set({ toast: { text, nonce: Date.now() } });

      return {
        dims: DEFAULT_DIMS,
        mode: "now",
        kit: false,
        zones: true,
        labels: true,
        layouts: freshLayouts(DEFAULT_DIMS),
        checks: {},

        selected: null,
        dragging: null,
        narrow: false,
        cam: { name: "corner", nonce: 0 },
        toast: null,

        setMode: (mode) => set({ mode, selected: null }),
        setKit: (kit) => set({ kit, selected: null }),
        setZones: (zones) => set({ zones }),
        setLabels: (labels) => set({ labels }),
        select: (selected) => set({ selected }),
        setDragging: (dragging) => set({ dragging }),

        moveItem: (id, x, y) => patch(id, (p) => ({ ...p, x: snap(x), y: snap(y), where: "room" })),

        nudge: (dx, dy) => {
          const { selected } = get();
          if (!selected || BY_ID[selected].locked) return;
          patch(selected, (p) => (p.where === "room" ? { ...p, x: snap(p.x + dx), y: snap(p.y + dy) } : p));
        },

        setWhere: (id, where) => {
          const { dims } = get();
          patch(id, (p) => (where === "room" && p.where !== "room"
            ? { ...p, where, x: Math.min(dims.W - 0.6, 1.8), y: dims.D / 2 }
            : { ...p, where }));
          if (where === "room") notify("Dropped in the middle. Drag it where it goes.");
        },

        rotate: (id) => {
          const target = id ?? get().selected;
          if (!target) return notify("Select something first");
          if (BY_ID[target].locked) return notify(`${BY_ID[target].name} stays put`);
          patch(target, (p) => ({ ...p, r: p.r === 90 ? 0 : 90 }));
        },

        drop: (id) => {
          const s = get();
          const st = s.layouts[layoutKey(s)][id];
          if (!st) return;
          const boxes = stagingBoxes(s.dims, s.narrow);
          const inside = (b: { x0: number; x1: number; y0: number; y1: number }) => st.x > b.x0 && st.x < b.x1 && st.y > b.y0 && st.y < b.y1;
          const it = BY_ID[id];
          if (inside(boxes.remove)) {
            patch(id, (p) => ({ ...p, where: "remove" }));
            notify(`${it.name} → Out pile`);
          } else if (inside(boxes.shelve)) {
            if (mountOf(it, st) !== "floor") {
              patch(id, (p) => ({ ...p, x: s.dims.W / 2, y: s.dims.D / 2 }));
              notify("That one can't go on a shelf");
            } else {
              patch(id, (p) => ({ ...p, where: "shelve" }));
              notify(`${it.name} → put away`);
            }
          }
        },

        resetLayout: () => {
          const s = get();
          const k = layoutKey(s);
          set({ layouts: { ...s.layouts, [k]: preset(k, s.dims) }, selected: null });
          notify("Layout reset");
        },

        setDims: (d) => {
          const s = get();
          const W = Math.min(8, Math.max(2.2, d.W)), D = Math.min(12, Math.max(3, d.D));
          const dW = W - s.dims.W, dD = D - s.dims.D;
          const layouts = { ...s.layouts };
          (Object.keys(layouts) as LayoutKey[]).forEach((k) => {
            const next: Layout = {};
            for (const [id, p] of Object.entries(layouts[k])) {
              next[id] = p.where !== "room" ? p : {
                ...p,
                x: p.x > s.dims.W / 2 ? p.x + dW : p.x,
                y: p.y > s.dims.D / 2 ? p.y + dD : p.y,
              };
            }
            layouts[k] = next;
          });
          set({ dims: { W, D }, layouts, cam: { ...s.cam, nonce: Date.now() } });
          notify(`Room set to ${W.toFixed(2)} × ${D.toFixed(2)} m`);
        },

        toggleCheck: (id) => set({ checks: { ...get().checks, [id]: !get().checks[id] } }),
        setNarrow: (narrow) => set({ narrow }),
        camTo: (name) => set({ cam: { name, nonce: Date.now() } }),
        focus: (id) => set({ cam: { name: "focus", target: id, nonce: Date.now() } }),
        notify,

        importJSON: (text) => {
          try {
            const data = JSON.parse(text) as Partial<Persisted>;
            if (!data || typeof data !== "object" || !data.layouts || !data.dims) throw new Error("bad");
            const valid = (["now", "plan", "kit"] as LayoutKey[]).every((k) => data.layouts && typeof data.layouts[k] === "object");
            if (!valid || typeof data.dims.W !== "number" || typeof data.dims.D !== "number") throw new Error("bad");
            set({
              dims: data.dims,
              layouts: data.layouts as Record<LayoutKey, Layout>,
              checks: data.checks ?? {},
              mode: data.mode ?? "now",
              kit: !!data.kit,
              selected: null,
            });
            notify("Layout imported");
            return true;
          } catch {
            notify("That file isn't a Garage Reset layout");
            return false;
          }
        },
      };
    },
    {
      name: "garage-reset-v2",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): Persisted => ({
        dims: s.dims, mode: s.mode, kit: s.kit, zones: s.zones, labels: s.labels, layouts: s.layouts, checks: s.checks,
      }),
    },
  ),
);

/** Exportable snapshot of everything worth keeping */
export function exportState(): string {
  const s = useStore.getState();
  const data: Persisted & { app: string; exportedAt: string } = {
    app: "garage-reset",
    exportedAt: new Date().toISOString(),
    dims: s.dims, mode: s.mode, kit: s.kit, zones: s.zones, labels: s.labels, layouts: s.layouts, checks: s.checks,
  };
  return JSON.stringify(data, null, 2);
}
