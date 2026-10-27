"use client";

import dynamic from "next/dynamic";

// WebGL and localStorage only exist in the browser, so the planner renders client-side.
const Planner = dynamic(() => import("@/components/Planner"), {
  ssr: false,
  loading: () => (
    <div className="boot">
      <span className="tape" aria-hidden="true" />
      <p>Opening the garage…</p>
    </div>
  ),
});

export default function ClientApp() {
  return <Planner />;
}
