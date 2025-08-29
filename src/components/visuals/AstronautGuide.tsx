"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";

export default function AstronautGuide() {
  // wander horizontally just above the dock
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ minX: 40, maxX: 0 });

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setBounds({ minX: 40, maxX: Math.max(40, w - 140) });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let active = true;

    const loop = async () => {
      while (active) {
        const x = Math.floor(
          Math.random() * (bounds.maxX - bounds.minX) + bounds.minX
        );
        const duration = 6 + Math.random() * 5; // slow wander
        await controls.start({
          x,
          transition: { duration, ease: "easeInOut" },
        });
      }
    };
    loop();
    return () => {
      active = false;
    };
  }, [bounds, controls]);

  // Respect reduced motion: keep static if reduce is on
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute bottom-24 left-0 right-0 z-40"
      aria-hidden
    >
      <motion.div
        initial={{ x: 80 }}
        animate={prefersReduced ? { x: 80 } : controls}
        className="relative mx-0 inline-flex items-end"
      >
        {/* pixel astronaut */}
        <Image
          src="/sprites/astronaut.png"
          alt=""
          width={80}
          height={80}
          className="image-render-pixel select-none drop-shadow"
          priority
        />

        {/* "scroll down" sign with gentle bob */}
        <motion.div
          initial={{ y: 0, rotate: -4 }}
          animate={prefersReduced ? {} : { y: [0, -6, 0] }}
          transition={prefersReduced ? {} : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="ml-2 rounded-sm border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white shadow dark:border-neutral-600"
          style={{ transformOrigin: "left bottom" }}
        >
          ↓ scroll down
        </motion.div>
      </motion.div>
    </div>
  );
}