"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { OPEN_GAME_EVENT } from "@/lib/site";

const HOME_X = 80;

export default function AstronautGuide() {
  // wander horizontally just above the dock
  const controls = useAnimation();
  const prefersReduced = useReducedMotion();
  const [bounds, setBounds] = useState({ minX: 40, maxX: 40 });

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
    // With Reduce Motion on, the astronaut stays put and no loop runs.
    if (prefersReduced) {
      controls.stop();
      controls.set({ x: HOME_X });
      return;
    }

    let active = true;
    let pause: ReturnType<typeof setTimeout> | undefined;

    const loop = async () => {
      while (active) {
        const x = Math.floor(
          Math.random() * (bounds.maxX - bounds.minX) + bounds.minX
        );
        const duration = 6 + Math.random() * 5; // slow wander
        const startedAt = performance.now();
        await controls.start({
          x,
          transition: { duration, ease: "easeInOut" },
        });
        // If nothing actually animated (for example the element is not mounted),
        // start() resolves at once. Wait before trying again so the loop can
        // never spin and lock up the page.
        if (active && performance.now() - startedAt < 50) {
          await new Promise<void>((resolve) => {
            pause = setTimeout(resolve, 1000);
          });
        }
      }
    };
    loop();
    return () => {
      active = false;
      if (pause) clearTimeout(pause);
      controls.stop();
    };
  }, [bounds, controls, prefersReduced]);

  return (
    <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-40 sm:bottom-24">
      <motion.div
        initial={{ x: HOME_X }}
        animate={controls}
        className="pointer-events-auto relative mx-0 inline-flex items-end"
      >
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_GAME_EVENT))}
          aria-label="Help me get home: play Mission Control, a developer game"
          title="Help me get home"
          className="inline-flex cursor-pointer items-end rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          {/* pixel astronaut (decorative; the button carries the label) */}
          <Image
            src="/sprites/astronaut.png"
            alt=""
            width={80}
            height={80}
            className="image-render-pixel h-20 w-20 max-w-none shrink-0 select-none drop-shadow"
          />

          {/* sign with a gentle bob */}
          <motion.span
            initial={{ y: 0, rotate: -4 }}
            animate={prefersReduced ? undefined : { y: [0, -6, 0] }}
            transition={prefersReduced ? undefined : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="ml-2 hidden rounded-sm border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white shadow sm:block dark:border-neutral-600"
            style={{ transformOrigin: "left bottom" }}
            aria-hidden="true"
          >
            Help me get home
          </motion.span>
        </button>
      </motion.div>
    </div>
  );
}
