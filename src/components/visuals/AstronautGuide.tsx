"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { OPEN_GAME_EVENT } from "@/lib/site";

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
      className="pointer-events-none absolute bottom-3 left-0 right-0 z-40 sm:bottom-24"
    >
      <motion.div
        initial={{ x: 80 }}
        animate={prefersReduced ? { x: 80 } : controls}
        className="pointer-events-auto relative mx-0 inline-flex items-end"
      >
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_GAME_EVENT))}
          aria-label="Play Mission Control, a developer game"
          title="Help me get home"
          className="inline-flex cursor-pointer items-end rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
        {/* pixel astronaut */}
        <Image
          src="/sprites/astronaut.png"
          alt=""
          width={80}
          height={80}
          className="image-render-pixel h-20 w-20 max-w-none shrink-0 select-none drop-shadow"
          priority
        />

        {/* "scroll down" sign with gentle bob */}
        <motion.span
          initial={{ y: 0, rotate: -4 }}
          animate={prefersReduced ? {} : { y: [0, -6, 0] }}
          transition={prefersReduced ? {} : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="ml-2 hidden rounded-sm sm:block border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white shadow dark:border-neutral-600"
          style={{ transformOrigin: "left bottom" }}
        >
          ↓ scroll down
        </motion.span>
        </button>
      </motion.div>
    </div>
  );
}