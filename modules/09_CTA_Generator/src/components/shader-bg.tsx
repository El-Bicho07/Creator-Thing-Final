"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";

const ShaderScene = dynamic(() => import("./shader-scene"), { ssr: false });

/**
 * Full-bleed animated gradient for dark sections. A CSS gradient in the same colours sits
 * underneath, so there's no flash while three.js loads, and something still shows without WebGL.
 * `scrim` darkens one side so text over it stays readable.
 */
export function ShaderBackdrop({ scrim = "left" }: { scrim?: "left" | "center" }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="shader-fallback absolute inset-0" />
      <ShaderScene animate={!reduce} />
      {scrim === "left" ? (
        <>
          {/* Phones: text runs the full width, so dim everything. Desktop: dim behind the copy and behind the card stack. */}
          <div className="absolute inset-0 bg-black/45 lg:hidden" />
          <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(0_0_0/0.62)_0%,rgb(0_0_0/0.28)_45%,transparent_75%)] lg:block" />
          <div className="absolute inset-0 hidden bg-[radial-gradient(38%_55%_at_80%_55%,rgb(0_0_0/0.4),transparent_72%)] lg:block" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgb(0_0_0/0.45),transparent_70%)]" />
      )}
    </div>
  );
}
