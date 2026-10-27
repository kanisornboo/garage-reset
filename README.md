# Garage Reset

Interactive 3D garage organiser. Flip between **Now** (the garage as it is, mapped from the walkthrough video) and **Plan** (a gym-first layout), drag kit around, and watch the floor check update live.

Built with Next.js (App Router) · TypeScript · React Three Fiber + drei · Zustand.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Needs Node 20.9 or newer.

## Deploy to Vercel

Zero config. Either:

- push this folder to a GitHub repo and import it at vercel.com/new, or
- run `npx vercel` from this folder.

Vercel detects Next.js automatically. No environment variables are needed.

## Using it

| Do this | To |
| --- | --- |
| Drag empty floor | Orbit the garage |
| Scroll / pinch | Zoom |
| Drag an item | Move it (snaps to 5 cm) |
| Drop an item on a side pad | Send it to the **Out** pile or **Put away** |
| Double-click an item | Fly the camera to it |
| `R` | Rotate the selected item 90° |
| Arrow keys | Nudge the selected item 5 cm |
| `Esc` | Deselect |

- **New kit** (Plan mode) shows ceiling bike hoists and an overhead rack.
- The treadmill, wall TV, washer and cabinet are locked in place.
- Red outlines and the **Problems** list flag overlaps, a blocked side door, clutter on the training floor, blocked shelves and anything overhead with no headroom.
- Layouts save to the browser automatically. **Export layout** / **Import layout** moves them between devices as a JSON file.
- The room defaults to 3.50 × 6.00 m (estimated from the video). Put real measurements in **Room size** and everything near the right and back walls shifts with them.

## Project layout

```
app/
  layout.tsx          fonts, metadata
  page.tsx            entry
  ClientApp.tsx       loads the planner client-side (WebGL + localStorage)
  globals.css         design tokens (light + dark) and UI styles
components/
  Planner.tsx         top bar, camera buttons, legend, toast, keyboard
  panel/SidePanel.tsx floor check, inspector, problems, checklist, room size, import/export
  scene/Scene.tsx     <Canvas>, lights, orbit controls, camera presets
  scene/Room.tsx      walls (auto see-through), doors, window, joists, zones, drop pads
  scene/Items.tsx     each item: drag, animation, highlight, label
  scene/models.tsx    low-poly models for every item
  scene/primitives.tsx box / cylinder / rod helpers, textures
lib/
  data.ts             inventory, preset layouts, checklist  ← edit this to change the garage
  geometry.ts         footprints, zones, problem checks, floor stats
  store.ts            Zustand store (persisted to localStorage)
  theme.ts            reads CSS tokens so the 3D scene follows light/dark mode
```

### Adding or changing an item

1. Add it to `ITEMS` in `lib/data.ts` (size in metres, category, mount, note).
2. Give it a position in the `P_NOW` / `P_PLAN` presets (x from the left wall, y from the roller door).
3. Optionally add a model case in `components/scene/models.tsx`. Anything without one shows as a grey box.

Then hit **Reset layout** in the app to load the new preset (saved layouts aren't overwritten automatically).
