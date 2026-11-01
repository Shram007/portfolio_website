"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { OPEN_GAME_EVENT } from "@/lib/site";

declare global {
  interface Window {
    play?: () => string;
  }
}

// The game loads only when someone starts it, so it adds nothing to the first page load.
const MissionControl = dynamic(() => import("@/components/game/MissionControl"), { ssr: false });

let greeted = false;

export default function MissionControlMount() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_GAME_EVENT, show);
    window.play = () => {
      show();
      return "Launching Mission Control...";
    };
    if (!greeted) {
      greeted = true;
      console.log(
        "%cHey, developer. 👋%c\nMy astronaut is stranded and the ship has 4 broken systems.\nType %cplay()%c to launch.",
        "color:#a78bfa;font-size:15px;font-weight:bold",
        "color:inherit",
        "color:#fbbf24;font-weight:bold",
        "color:inherit"
      );
    }
    return () => {
      window.removeEventListener(OPEN_GAME_EVENT, show);
      delete window.play;
    };
  }, []);

  return open ? <MissionControl onClose={() => setOpen(false)} /> : null;
}
