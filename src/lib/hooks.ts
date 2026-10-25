"use client";

import { useSyncExternalStore } from "react";

/** Subscribes to a CSS media query. Returns `fallback` during SSR and hydration. */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => fallback
  );
}
