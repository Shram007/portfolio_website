"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef, useState, useEffect } from "react";

// Low-cost moving starfield. Honors reduced-motion.
function Stars({ count = 800, starColor = "#ffffff" }) {
  const pointsRef = useRef<THREE.Points>(null!);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // spread in a box around the camera
      positions[i * 3 + 0] = (Math.random() - 0.5) * 60;  // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;  // y
      positions[i * 3 + 2] = -Math.random() * 80;         // z (away)
      speeds[i] = 0.02 + Math.random() * 0.05;            // fall speed
    }
    return { positions, speeds };
  }, [count]);

  // Respect reduced-motion
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  useFrame(() => {
    if (prefersReduced) return;
    const p = pointsRef.current;
    const array = (p.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      array[i * 3 + 1] -= speeds[i]; // move down (y-)
      if (array[i * 3 + 1] < -30) {
        // wrap to top
        array[i * 3 + 1] = 30;
        array[i * 3 + 0] = (Math.random() - 0.5) * 60;
        array[i * 3 + 2] = -Math.random() * 80;
      }
    }
    (p.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial color={starColor} size={0.06} sizeAttenuation />
    </points>
  );
}

export default function Starfield() {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      if (typeof window !== "undefined") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(isDark);
      }
    };

    checkTheme();

    // Listen for theme changes
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  const starColor = isDarkMode ? "#ffffff" : "#000000";

  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <Stars starColor={starColor} />
      </Canvas>
    </div>
  );
}
