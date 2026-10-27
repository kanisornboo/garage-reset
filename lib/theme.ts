"use client";

import { useEffect, useState } from "react";

/** CSS custom properties the 3D scene needs, read live so the scene follows light/dark mode. */
const TOKENS = [
  "stage", "floor", "wall", "roller", "glass", "doorc", "boxline", "accent", "danger", "muted", "panel", "fg",
  "gym-f", "gym-l", "storage-f", "storage-l", "utility-f", "utility-l", "garden-f", "garden-l",
  "bikes-f", "bikes-l", "fixed-f", "fixed-l", "mat-f", "mat-l", "kit-f", "kit-l",
] as const;

export type Token = (typeof TOKENS)[number];
export type Palette = Record<Token, string>;

function read(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const out = {} as Palette;
  for (const t of TOKENS) out[t] = cs.getPropertyValue(`--${t}`).trim() || "#ff00ff";
  return out;
}

export function usePalette(): Palette {
  const [pal, setPal] = useState<Palette>(read);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setPal(read());
    mq.addEventListener("change", update);
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => {
      mq.removeEventListener("change", update);
      mo.disconnect();
    };
  }, []);
  return pal;
}
