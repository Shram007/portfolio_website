"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// three.js is heavy: load it after first paint, when the browser is idle.
const Starfield = dynamic(() => import("@/components/visuals/Starfield"), { ssr: false });

export default function LazyStarfield() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(id);
  }, []);

  return ready ? <Starfield /> : null;
}
