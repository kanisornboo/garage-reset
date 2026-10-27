# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Garage Reset is an interactive 3D garage organizer built with Next.js and Three.js. Users can flip between "Now" (current layout) and "Plan" (gym-first layout), drag items around, and watch floor statistics update live.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run typecheck    # Run TypeScript type checking (tsc --noEmit)
```

Deploy to Vercel: push to GitHub and import, or run `npx vercel`. No environment variables required.

## Architecture

### Client-Side Only Rendering
The app uses `"use client"` with `ssr: false` dynamic import because it requires WebGL (Three.js) and localStorage. The entry flow is:
- `app/page.tsx` → `app/ClientApp.tsx` (dynamic, no SSR) → `components/Planner.tsx`

### State Management (Zustand)
`lib/store.ts` contains the Zustand store with localStorage persistence ("garage-reset-v2"):

**Persisted:** `dims` (room size), `mode` ("now"/"plan"), `kit` (show new equipment), `zones`, `labels`, `layouts` (all placements), `checks` (checklist)

**Transient:** `selected`, `dragging`, `cam`, `toast`, `narrow`

### 3D Scene Structure (`components/scene/`)
- `Scene.tsx` - Canvas setup, lights, camera rig, OrbitControls
- `Room.tsx` - Static environment (walls, doors, window, joists, zones)
- `Items.tsx` - Draggable garage items with selection/animation
- `models.tsx` - Low-poly 3D models for each item type
- `primitives.tsx` - Box/cylinder helpers, procedural texture generation

### Key Data Files
- `lib/data.ts` - Item inventory (ITEMS), preset layouts (P_NOW, P_PLAN, P_KIT), STEPS checklist
- `lib/geometry.ts` - Footprint calculation, overlap detection, floor stats, zone definitions, problem detection
- `lib/theme.ts` - Reads CSS tokens for 3D scene color sync

## Key Patterns

### Adding/Changing Items
1. Edit `lib/data.ts`: add to ITEMS array (size in metres, category, mount type)
2. Add positions to P_NOW and/or P_PLAN presets
3. Optionally add 3D model in `components/scene/models.tsx` (defaults to grey box)

### Data Types
```typescript
interface Item { id: string; name: string; w: number; h: number; cat: Category; mount: Mount; note: string; }
interface Placement { x: number; y: number; r: 0 | 90; where: Where; }
type Layout = Record<string, Placement>;
```

### Keyboard Shortcuts (in Planner.tsx)
- **R** - Rotate selected item 90°
- **Esc** - Deselect
- **Arrow keys** - Nudge 5cm

### Grid & Positioning
- Snap grid: 5cm (0.05m)
- Coordinates: x = from left wall, y = from roller door
- Camera presets: "corner", "top", "door", "roller", or "focus" (fly-to item)

## Tech Stack
- Next.js 16.4, React 19.3, TypeScript 5.9 (strict mode)
- Three.js 0.186 via React Three Fiber 9.8 + Drei 10.7
- Zustand 5.0 for state with localStorage persistence
- Node.js >= 20.9 required
