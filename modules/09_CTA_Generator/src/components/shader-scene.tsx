"use client";

import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";

/**
 * The WebGL gradient. Loaded only in the browser through shader-bg.tsx, so three.js stays out of
 * the main bundle. The canvas mounts only while it's on screen (lazyLoad).
 */
export default function ShaderScene({ animate }: { animate: boolean }) {
  return (
    // Oversized so the edges of the water plane fall outside the section on wide screens.
    // (The canvas wrapper sets width/height 100% itself, so size it explicitly rather than with inset.)
    <ShaderGradientCanvas
      style={{ position: "absolute", top: "-14%", left: "-14%", width: "128%", height: "128%" }}
      pixelDensity={1}
      fov={45}
      pointerEvents="none"
      powerPreference="low-power"
      lazyLoad
    >
      <ShaderGradient
        control="props"
        type="waterPlane"
        animate={animate ? "on" : "off"}
        uTime={0.2}
        uSpeed={0.1}
        uStrength={2.4}
        uDensity={1.1}
        uFrequency={5.5}
        uAmplitude={0}
        positionX={-0.5}
        positionY={0.1}
        positionZ={0}
        rotationX={0}
        rotationY={0}
        rotationZ={235}
        color1="#5606ff"
        color2="#fe8989"
        color3="#000000"
        reflection={0.1}
        wireframe={false}
        shader="defaults"
        cAzimuthAngle={180}
        cPolarAngle={115}
        cDistance={3.9}
        cameraZoom={1}
        lightType="3d"
        brightness={1.1}
        envPreset="city"
        grain="off"
        range="disabled"
        rangeStart={0}
        rangeEnd={40}
      />
    </ShaderGradientCanvas>
  );
}
