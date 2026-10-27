import { BY_ID, ITEMS, type Category, type Dims, type Item, type Layout, type Mount, type Placement } from "./data";

export interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export const SNAP = 0.05;
export const snap = (v: number) => Math.round(v / SNAP) * SNAP;

export const mountOf = (it: Item, st: Placement): Mount => st.mount ?? it.mount;

/** Footprint size on the floor after rotation */
export function footprint(it: Item, st: Placement): [number, number] {
  const w = st.w ?? it.w, h = st.h ?? it.h;
  return st.r === 90 ? [h, w] : [w, h];
}

export function rectOf(it: Item, st: Pick<Placement, "x" | "y" | "r" | "w" | "h">): Rect {
  const [w, h] = footprint(it, st as Placement);
  return { x0: st.x - w / 2, x1: st.x + w / 2, y0: st.y - h / 2, y1: st.y + h / 2 };
}

export function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

export interface Zone extends Rect {
  id: string;
  label: string;
  cat: Category;
}

export function zones({ W, D }: Dims, kit: boolean): Zone[] {
  return [
    { id: "gym", label: "Gym", cat: "gym", x0: 0.05, x1: W - 0.55, y0: 0.05, y1: 2.55 },
    { id: "storage", label: "Storage", cat: "storage", x0: 0.05, x1: 0.55, y0: 2.38, y1: D - 0.3 },
    { id: "bikes", label: kit ? "Stretch space" : "Bike park", cat: "bikes", x0: 0.6, x1: W - 1.0, y0: D - 1.3, y1: D - 0.05 },
    { id: "garden", label: "Garden", cat: "garden", x0: W - 0.9, x1: W - 0.05, y0: D - 2.1, y1: D - 0.05 },
    { id: "laundry", label: "Laundry", cat: "utility", x0: W - 0.7, x1: W - 0.05, y0: 2.6, y1: D - 2.15 },
  ];
}

export const trainingFloor = ({ W }: Dims): Rect => ({ x0: 2.0, x1: W - 0.05, y0: 0.55, y1: 2.5 });

export const sideDoor = ({ W, D }: Dims) => ({ hx: W - 0.05, hy: D, r: 0.75 });

export const windowSpan = ({ W }: Dims) => ({ x0: W * 0.28, x1: W * 0.72 });

/** The two drop zones beside the garage. On narrow screens they sit in front of the roller door. */
export function stagingBoxes({ W, D }: Dims, narrow: boolean): { shelve: Rect; remove: Rect } {
  if (narrow) {
    return {
      shelve: { x0: 0, x1: W / 2 - 0.08, y0: -2.25, y1: -0.75 },
      remove: { x0: W / 2 + 0.08, x1: W, y0: -2.25, y1: -0.75 },
    };
  }
  return {
    shelve: { x0: W + 0.45, x1: W + 2.15, y0: 0, y1: D / 2 - 0.12 },
    remove: { x0: W + 0.45, x1: W + 2.15, y0: D / 2 + 0.12, y1: D },
  };
}

/** Positions for items sitting in the drop zones, packed in rows. Pure: doesn't touch the layout. */
export function stagedPositions(layout: Layout, dims: Dims, narrow: boolean): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const boxes = stagingBoxes(dims, narrow);
  for (const where of ["shelve", "remove"] as const) {
    const b = boxes[where];
    let cx = b.x0 + 0.1, cy = b.y1 - 0.32, rowH = 0;
    for (const it of ITEMS) {
      const st = layout[it.id];
      if (!st || st.where !== where) continue;
      const [w, h] = footprint(it, st);
      if (cx + w > b.x1 - 0.08 && cx > b.x0 + 0.1) {
        cx = b.x0 + 0.1;
        cy -= rowH + 0.1;
        rowH = 0;
      }
      out[it.id] = { x: cx + w / 2, y: cy - h / 2 };
      cx += w + 0.1;
      rowH = Math.max(rowH, h);
    }
  }
  return out;
}

export interface Issue {
  ids: string[];
  text: string;
}

const inRoom = (layout: Layout) => ITEMS.filter((it) => layout[it.id]?.where === "room");

export function computeIssues(layout: Layout, dims: Dims): Issue[] {
  const out: Issue[] = [];
  const items = inRoom(layout);
  const floor = items.filter((it) => mountOf(it, layout[it.id]) === "floor");
  const r = (it: Item) => rectOf(it, layout[it.id]);

  for (let i = 0; i < floor.length; i++)
    for (let j = i + 1; j < floor.length; j++)
      if (overlapArea(r(floor[i]), r(floor[j])) > 0.004)
        out.push({ ids: [floor[i].id, floor[j].id], text: `${floor[i].name} and ${floor[j].name} overlap` });

  for (const it of items) {
    const b = r(it);
    if (b.x0 < -0.02 || b.y0 < -0.02 || b.x1 > dims.W + 0.02 || b.y1 > dims.D + 0.02)
      out.push({ ids: [it.id], text: `${it.name} is poking through a wall` });
  }

  const d = sideDoor(dims);
  for (const it of floor) {
    const b = r(it);
    const nx = Math.max(b.x0, Math.min(d.hx, b.x1)), ny = Math.max(b.y0, Math.min(d.hy, b.y1));
    if (Math.hypot(nx - d.hx, ny - d.hy) < d.r - 0.02 && b.x0 < d.hx)
      out.push({ ids: [it.id], text: `${it.name} is in the side door's swing` });
  }

  const tz = trainingFloor(dims);
  for (const it of floor)
    if (it.cat !== "gym" && overlapArea(r(it), tz) > 0.004)
      out.push({ ids: [it.id], text: `${it.name} is on the training floor` });

  for (const sid of ["shelfA", "shelfB"]) {
    const st = layout[sid];
    if (!st || st.where !== "room") continue;
    const sb = rectOf(BY_ID[sid], st);
    const front: Rect = st.r === 90
      ? { x0: sb.x1, x1: sb.x1 + 0.5, y0: sb.y0 + 0.05, y1: sb.y1 - 0.05 }
      : { x0: sb.x0 + 0.05, x1: sb.x1 - 0.05, y0: sb.y1, y1: sb.y1 + 0.5 };
    for (const it of floor) {
      if (it.id === sid || it.id === "ladder" || it.id.startsWith("shelf")) continue;
      if (overlapArea(r(it), front) > 0.01)
        out.push({ ids: [it.id, sid], text: `${it.name} blocks access to ${BY_ID[sid].name.toLowerCase()}` });
    }
  }

  for (const o of items.filter((it) => mountOf(it, layout[it.id]) === "overhead")) {
    for (const g of ["treadmill", "bench"]) {
      const gs = layout[g];
      if (gs?.where === "room" && overlapArea(r(o), rectOf(BY_ID[g], gs)) > 0.01)
        out.push({ ids: [o.id], text: `${o.name} hangs over the ${BY_ID[g].name.toLowerCase()}, no headroom` });
    }
  }
  return out;
}

export interface FloorStats {
  open: number;
  training: number;
}

/** Sample the floor on a 5 cm grid: open area, and how much of the training floor is free of non-gym kit. */
export function floorStats(layout: Layout, dims: Dims): FloorStats {
  const step = 0.05;
  const rects = inRoom(layout)
    .filter((it) => mountOf(it, layout[it.id]) === "floor")
    .map((it) => ({ b: rectOf(it, layout[it.id]), gym: it.cat === "gym" }));
  const tz = trainingFloor(dims);
  let free = 0, tFree = 0, tTot = 0;
  for (let x = step / 2; x < dims.W; x += step)
    for (let y = step / 2; y < dims.D; y += step) {
      let covered = false, coveredNonGym = false;
      for (const o of rects)
        if (x > o.b.x0 && x < o.b.x1 && y > o.b.y0 && y < o.b.y1) {
          covered = true;
          if (!o.gym) coveredNonGym = true;
        }
      if (!covered) free++;
      if (x > tz.x0 && x < tz.x1 && y > tz.y0 && y < tz.y1) {
        tTot++;
        if (!coveredNonGym) tFree++;
      }
    }
  return { open: free * step * step, training: tTot ? (tFree / tTot) * 100 : 0 };
}
