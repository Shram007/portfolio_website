"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const IS_SERVER = typeof window === "undefined";
const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useMediaQuery(query: string, { defaultValue = false } = {}) {
  const get = (q: string) => (IS_SERVER ? defaultValue : window.matchMedia(q).matches);
  const [match, setMatch] = useState(() => get(query));
  useIsoLayout(() => {
    const mm = window.matchMedia(query);
    const onChange = () => setMatch(get(query));
    onChange(); mm.addEventListener("change", onChange);
    return () => mm.removeEventListener("change", onChange);
  }, [query]);
  return match;
}