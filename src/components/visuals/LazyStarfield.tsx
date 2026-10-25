"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// three.js is heavy: load it after first interaction, or well after the page is usable, so it never counts against load.
const Starfield = dynamic(() => import("@/components/visuals/Starfield"), { ssr: false });

const EVENTS = ["pointermove", "pointerdown", "scroll", "keydown", "touchstart"] as const;

export default function LazyStarfield() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = () => setReady(true);
    const timer = setTimeout(start, 8000);
    EVENTS.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    return () => {
      clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, start));
    };
  }, []);

  return ready ? <Starfield /> : null;
}
