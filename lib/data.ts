// Inventory, preset layouts and the reset checklist.
// Coordinates are metres on the garage floor: x runs left → right wall,
// y runs from the roller door (y = 0) to the back wall (y = depth).

export type Category = "gym" | "storage" | "utility" | "garden" | "bikes" | "fixed" | "mat" | "kit";
export type Mount = "floor" | "wall" | "overhead" | "mat";
export type Where = "room" | "remove" | "shelve";
export type LayoutKey = "now" | "plan" | "kit";

export interface Item {
  id: string;
  name: string;
  /** Length along local X, metres */
  w: number;
  /** Depth along local Z, metres */
  h: number;
  cat: Category;
  mount: Mount;
  locked?: boolean;
  note: string;
}

export interface Placement {
  x: number;
  y: number;
  /** 0 or 90 degrees */
  r: 0 | 90;
  where: Where;
  /** Optional footprint overrides (e.g. walking pad stood on end) */
  w?: number;
  h?: number;
  /** Optional mount override (e.g. bikes hoisted into the joists) */
  mount?: Mount;
}

export type Layout = Record<string, Placement>;

export interface Dims {
  W: number;
  D: number;
}

export const DEFAULT_DIMS: Dims = { W: 3.5, D: 6.0 };

export const CATS: Record<Category, string> = {
  gym: "Gym",
  storage: "Storage",
  utility: "Laundry",
  garden: "Garden & tools",
  bikes: "Bikes",
  fixed: "Fixed",
  mat: "Floor",
  kit: "New kit",
};

export const ITEMS: Item[] = [
  { id: "treadmill", name: "Treadmill", w: 1.9, h: 0.85, cat: "gym", mount: "floor", locked: true, note: "Stays put with the console under the wall TV. The TV and wiring are staying, so this anchors the whole gym." },
  { id: "tv", name: "Wall TV", w: 1.0, h: 0.08, cat: "fixed", mount: "wall", locked: true, note: "Wall-mounted on the left wall above the treadmill console. Fixed." },
  { id: "mats", name: "Rubber gym mats", w: 2.5, h: 2.9, cat: "mat", mount: "mat", note: "Interlocking tiles. In the plan they're relaid as one block under the whole gym zone, cardboard gone." },
  { id: "spin", name: "Spin bike", w: 1.15, h: 0.55, cat: "gym", mount: "floor", note: "Right now it's parked in front of the shelving and blocking it. In the plan it sits alongside the treadmill so both face the TV." },
  { id: "bench", name: "Adjustable bench", w: 0.5, h: 1.3, cat: "gym", mount: "floor", note: "Middle of the training floor, with room all round for presses and rows." },
  { id: "pad", name: "Walking pad", w: 1.4, h: 0.6, cat: "gym", mount: "floor", note: "The flat treadmill by the roller door. Stand it on end in the front corner when it's not in use. Check the manual says upright storage is fine; if not, slide it under the bench." },
  { id: "weights", name: "Dumbbells", w: 0.45, h: 0.3, cat: "gym", mount: "floor", note: "At the foot of the bench, on the mats." },
  { id: "shelfA", name: "Shelving unit 1", w: 1.2, h: 0.45, cat: "storage", mount: "floor", note: "House and gym stuff. Clear labelled boxes, heavy at the bottom. Both units slide back towards the rear wall so the spin bike fits in front of them." },
  { id: "shelfB", name: "Shelving unit 2", w: 1.2, h: 0.45, cat: "storage", mount: "floor", note: "DIY, car and seasonal. The cool bags and gear bag go on top." },
  { id: "toolshelf", name: "Tool shelf", w: 1.2, h: 0.25, cat: "storage", mount: "wall", note: "The wall shelf of tools and chemicals on the back wall. Bin anything dried out or duplicated and keep the floor under it clear." },
  { id: "ladder", name: "Step ladder", w: 0.5, h: 0.15, cat: "storage", mount: "floor", note: "Folded flat and slotted into the gap at the end of shelving unit 2, against the wall." },
  { id: "mtb", name: "Mountain bike", w: 1.8, h: 0.6, cat: "bikes", mount: "floor", note: "Along the back wall under the window." },
  { id: "road", name: "Second bike", w: 1.7, h: 0.55, cat: "bikes", mount: "floor", note: "Parallel to the mountain bike, nose to tail so the bars don't lock together." },
  { id: "chair", name: "Office chair (wrapped)", w: 0.65, h: 0.65, cat: "storage", mount: "floor", note: "Still in its plastic and not being used. Sell it while it looks new, or take it indoors. Right now it's eating floor in the middle of the garage." },
  { id: "shoes", name: "Boots & shoes", w: 0.5, h: 0.35, cat: "storage", mount: "floor", note: "Off the cardboard and onto the bottom shelf of the garden rack by the side door." },
  { id: "bags", name: "Cool bags & gear bag", w: 0.7, h: 0.9, cat: "storage", mount: "floor", note: "The pile next to the washer. Up onto the top of shelving unit 2, or the ceiling rack if you get one." },
  { id: "peacock", name: "Peacock", w: 0.4, h: 0.4, cat: "garden", mount: "floor", note: "Garden ornament. Out into the garden where it belongs, or donate it." },
  { id: "garden", name: "Garden rack", w: 0.8, h: 0.35, cat: "garden", mount: "floor", note: "Stays next to the side door, since that's the route to the garden." },
  { id: "rail", name: "Tool rail", w: 0.55, h: 0.08, cat: "garden", mount: "wall", note: "Wall rail for spades, forks and brooms." },
  { id: "bucket", name: "Planter", w: 0.4, h: 0.4, cat: "garden", mount: "floor", note: "Under the tool rail." },
  { id: "stool", name: "Step stool", w: 0.4, h: 0.4, cat: "garden", mount: "floor", note: "Under the tool rail next to the planter." },
  { id: "bin", name: "Bin", w: 0.35, h: 0.35, cat: "utility", mount: "floor", note: "By the roller door so it goes straight out on bin day." },
  { id: "cabinet", name: "Cabinet & worktop", w: 0.6, h: 0.6, cat: "utility", mount: "floor", locked: true, note: "Fixed. Keep the worktop for laundry only, not a dumping shelf." },
  { id: "washer", name: "Washing machine", w: 0.6, h: 0.6, cat: "utility", mount: "floor", locked: true, note: "Plumbed in, so it stays." },
  { id: "hoists", name: "Bike hoists ×2", w: 1.8, h: 0.9, cat: "kit", mount: "overhead", note: "Pulley hoists screwed into the exposed joists. Both bikes go up and the strip along the back wall comes free for stretching." },
  { id: "rack", name: "Ceiling rack", w: 1.8, h: 1.2, cat: "kit", mount: "overhead", note: "Overhead rack between the joists for seasonal stuff and the bag pile. Keep it well away from the treadmill and bench for headroom." },
];

export const BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

type PresetEntry = Partial<Placement>;
const P_NOW: Record<string, PresetEntry> = {
  treadmill: { x: 1.0, y: 1.2 }, tv: { x: 0.04, y: 1.2, r: 90 }, mats: { x: 1.3, y: 1.5 },
  pad: { x: 2.45, y: 0.4 }, bench: { x: 2.3, y: 1.35 }, weights: { x: 1.5, y: 0.35 },
  shelfA: { x: 0.25, y: 2.75, r: 90 }, shelfB: { x: 0.25, y: 4.0, r: 90 }, spin: { x: 0.95, y: 4.3, r: 90 },
  chair: { x: 1.45, y: 5.0 }, toolshelf: { x: 1.0, y: 5.87 }, ladder: { x: 1.9, y: 5.3, r: 90 },
  road: { x: 1.6, y: 5.6 }, mtb: { x: 2.05, y: 5.2 }, shoes: { x: 2.1, y: 4.55 },
  garden: { x: 3.27, y: 4.85, r: 90 }, rail: { x: 3.46, y: 4.15, r: 90 }, bucket: { x: 2.85, y: 4.35 }, stool: { x: 2.75, y: 4.85 },
  bin: { x: 3.25, y: 4.05 }, cabinet: { x: 3.15, y: 3.55 }, washer: { x: 3.15, y: 2.9 },
  bags: { x: 3.1, y: 2.0 }, peacock: { x: 3.0, y: 1.3 },
};
const P_PLAN: Record<string, PresetEntry> = {
  treadmill: { x: 1.0, y: 1.2 }, tv: { x: 0.04, y: 1.2, r: 90 }, mats: { x: 1.5, y: 1.3, r: 90 },
  spin: { x: 0.65, y: 2.05 }, bench: { x: 2.45, y: 1.45 }, weights: { x: 2.45, y: 0.45 },
  pad: { x: 0.1, y: 0.4, r: 90, w: 0.6, h: 0.15 },
  shelfA: { x: 0.25, y: 3.0, r: 90 }, shelfB: { x: 0.25, y: 4.25, r: 90 }, ladder: { x: 0.1, y: 5.15, r: 90 }, toolshelf: { x: 1.0, y: 5.87 },
  road: { x: 1.45, y: 5.1 }, mtb: { x: 1.55, y: 5.68 },
  garden: { x: 3.27, y: 4.85, r: 90 }, rail: { x: 3.46, y: 4.15, r: 90 }, bucket: { x: 3.22, y: 4.15 }, stool: { x: 2.8, y: 4.15 },
  bin: { x: 3.25, y: 0.3 }, cabinet: { x: 3.15, y: 3.55 }, washer: { x: 3.15, y: 2.9 },
  chair: { where: "remove" }, peacock: { where: "remove" }, bags: { where: "shelve" }, shoes: { where: "shelve" },
};
const P_KIT: Record<string, PresetEntry> = {
  ...P_PLAN,
  hoists: { x: 1.55, y: 5.35 }, rack: { x: 1.6, y: 3.95 },
  road: { x: 1.5, y: 5.15, mount: "overhead" }, mtb: { x: 1.6, y: 5.5, mount: "overhead" },
};
const PRESETS: Record<LayoutKey, Record<string, PresetEntry>> = { now: P_NOW, plan: P_PLAN, kit: P_KIT };

/** Build a preset layout, shifting anything near the right/back walls if the room isn't 3.5 × 6 m. */
export function preset(key: LayoutKey, dims: Dims): Layout {
  const out: Layout = {};
  for (const [id, p] of Object.entries(PRESETS[key])) {
    const where = p.where ?? "room";
    let x = p.x ?? 0, y = p.y ?? 0;
    if (where === "room") {
      if (x > DEFAULT_DIMS.W / 2) x += dims.W - DEFAULT_DIMS.W;
      if (y > DEFAULT_DIMS.D / 2) y += dims.D - DEFAULT_DIMS.D;
    }
    out[id] = { x, y, r: p.r ?? 0, where, ...(p.w ? { w: p.w } : {}), ...(p.h ? { h: p.h } : {}), ...(p.mount ? { mount: p.mount } : {}) };
  }
  return out;
}

export interface Step {
  id: string;
  title: string;
  body: string;
  kit?: boolean;
}

export const STEPS: Step[] = [
  { id: "clear", title: "Empty the back half of the floor", body: "Drag everything on the floor between the shelving and the side door onto the gym mats. You can't sort what you can't see." },
  { id: "out", title: "Make the Out pile", body: "The wrapped office chair goes (sell it while it's still in the plastic), the peacock goes to the garden, the cardboard goes to recycling. Bin dried-out paint and duplicate cleaners off the tool shelf." },
  { id: "shelves", title: "Slide both shelving units towards the back wall", body: "Unit 1 for house and gym kit, unit 2 for DIY, car and seasonal. Heavy at the bottom, labelled boxes, nothing on the floor in front." },
  { id: "gym", title: "Build the gym zone", body: "Spin bike alongside the treadmill so both face the TV. Relay the mats as one block, bench in the middle of the training floor, dumbbells at its foot." },
  { id: "pad", title: "Stand the walking pad on end", body: "Front-left corner beside the treadmill. Check the manual allows upright storage first; if not, it slides under the bench." },
  { id: "bikes", title: "Park the bikes along the back wall", body: "Parallel and nose to tail under the window. The step ladder folds flat into the gap at the end of shelving unit 2." },
  { id: "garden", title: "Sort the garden corner by the side door", body: "Rack stays, long tools on the rail, planter and step stool under the rail, boots on the rack's bottom shelf. Keep the door's swing clear." },
  { id: "laundry", title: "Clear the laundry corner", body: "Bag pile up onto shelving unit 2. Worktop is for laundry only. Bin moves to the roller door." },
  { id: "kit", kit: true, title: "Optional: get things up into the joists", body: "Two ceiling bike hoists free the back strip for stretching, and a ceiling rack takes the bags and seasonal stuff. Fix into the joists, never over the treadmill or bench." },
];
