"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function MinimalistGridMesh() {
  const meshRef = useRef<THREE.LineSegments>(null!);
  
  const geometry = useMemo(() => {
    const size = 14;
    const divisions = 28;
    const step = size / divisions;
    const halfSize = size / 2;

    const vertices: number[] = [];

    for (let i = 0; i <= divisions; i++) {
      const z = -halfSize + i * step;
      vertices.push(-halfSize, 0, z, halfSize, 0, z);

      const x = -halfSize + i * step;
      vertices.push(x, 0, -halfSize, x, 0, halfSize);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.rotation.x = Math.PI * 0.28 + Math.sin(t * 0.2) * 0.02;
      meshRef.current.rotation.y = Math.sin(t * 0.12) * 0.03;
      meshRef.current.position.y = -1.1 + Math.cos(t * 0.25) * 0.08;
    }
  });

  return (
    <lineSegments ref={meshRef} geometry={geometry}>
      <lineBasicMaterial color="#ffffff" opacity={0.12} transparent linewidth={1} />
    </lineSegments>
  );
}

function FloatingNodes() {
  const pointsRef = useRef<THREE.Points>(null!);
  
  const [positions] = useState(() => {
    const count = 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  });

  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        transparent
        color="#ffffff"
        size={0.025}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.3}
      />
    </points>
  );
}

export function Hero3DCanvas() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-brand-secondary/40 via-brand-primary to-brand-primary" />
    );
  }

  return (
    <div className="absolute inset-0 z-0 h-full w-full pointer-events-none opacity-85">
      <Canvas camera={{ position: [0, 2, 6], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <MinimalistGridMesh />
        <FloatingNodes />
      </Canvas>
    </div>
  );
}

